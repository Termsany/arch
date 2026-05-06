import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type StorageProvider = "local" | "s3" | "r2";

export interface StoredFile {
  provider: StorageProvider;
  fileName: string;
  filePath: string;
  fileUrl: string | null;
  storageKey: string | null;
  bucketName: string | null;
  contentType: string | null;
  checksum: string | null;
}

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  officeId?: number | null;
  projectId?: number | null;
}

export interface DeleteFileInput {
  provider?: string | null;
  fileName: string;
  filePath?: string | null;
  storageKey?: string | null;
  bucketName?: string | null;
}

export interface StorageHealth {
  provider: StorageProvider;
  bucketConfigured: boolean;
  endpointConfigured: boolean;
  bucketName: string | null;
  endpoint: string | null;
  canConnect: boolean | null;
  error?: string;
}

export const UPLOADS_DIR = process.env["UPLOAD_DIR"]
  ? path.resolve(process.env["UPLOAD_DIR"])
  : path.resolve(__dirname, "../../uploads");

const rawProvider = (process.env["STORAGE_PROVIDER"] || "local").toLowerCase();
const provider: StorageProvider = rawProvider === "r2" ? "r2" : rawProvider === "s3" ? "s3" : "local";

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function safeFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
  return `${base}${ext}`;
}

function uniqueFileName(originalName: string) {
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeFileName(originalName)}`;
}

function checksum(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function saveLocal(input: SaveFileInput): Promise<StoredFile> {
  ensureUploadsDir();
  const fileName = uniqueFileName(input.originalName);
  const absolutePath = path.join(UPLOADS_DIR, fileName);
  await fs.promises.writeFile(absolutePath, input.buffer);
  return {
    provider: "local",
    fileName,
    filePath: `/uploads/${fileName}`,
    fileUrl: null,
    storageKey: null,
    bucketName: null,
    contentType: input.mimeType || null,
    checksum: checksum(input.buffer),
  };
}

function normalizeEndpoint(value: string, providerName: "r2" | "s3") {
  const endpoint = value.trim().replace(/\/+$/, "");
  if (!endpoint) return "";
  const url = new URL(endpoint);
  if (url.pathname && url.pathname !== "/") {
    throw new Error(`${providerName.toUpperCase()}_ENDPOINT must not include a bucket name or path. Use ${url.origin} and put the bucket in ${providerName.toUpperCase()}_BUCKET.`);
  }
  return url.origin;
}

function getCloudConfig(providerName: "r2" | "s3") {
  const isR2 = providerName === "r2";
  const bucket = (isR2 ? process.env["R2_BUCKET"] : process.env["S3_BUCKET"]) || process.env["S3_BUCKET"] || "";
  const endpointInput = (isR2 ? process.env["R2_ENDPOINT"] : process.env["S3_ENDPOINT"]) || process.env["S3_ENDPOINT"] || "";
  const accessKeyId = (isR2 ? process.env["R2_ACCESS_KEY_ID"] : process.env["S3_ACCESS_KEY_ID"]) || process.env["S3_ACCESS_KEY_ID"] || "";
  const secretAccessKey = (isR2 ? process.env["R2_SECRET_ACCESS_KEY"] : process.env["S3_SECRET_ACCESS_KEY"]) || process.env["S3_SECRET_ACCESS_KEY"] || "";
  const publicBaseUrl = (isR2 ? process.env["R2_PUBLIC_BASE_URL"] : process.env["S3_PUBLIC_BASE_URL"]) || process.env["S3_PUBLIC_BASE_URL"] || "";
  const region = isR2 ? "auto" : (process.env["S3_REGION"] || "auto");
  const required = [
    [isR2 ? "R2_BUCKET" : "S3_BUCKET", bucket],
    [isR2 ? "R2_ENDPOINT" : "S3_ENDPOINT", endpointInput],
    [isR2 ? "R2_ACCESS_KEY_ID" : "S3_ACCESS_KEY_ID", accessKeyId],
    [isR2 ? "R2_SECRET_ACCESS_KEY" : "S3_SECRET_ACCESS_KEY", secretAccessKey],
  ] as const;
  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`${providerName.toUpperCase()} storage is not configured. Missing: ${missing.join(", ")}`);
  }
  return {
    providerName,
    bucket,
    endpoint: normalizeEndpoint(endpointInput, providerName),
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    region,
  };
}

function createCloudClient(config: ReturnType<typeof getCloudConfig>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function publicFileUrl(publicBaseUrl: string, storageKey: string) {
  return publicBaseUrl ? `${publicBaseUrl.replace(/\/+$/, "")}/${storageKey.split("/").map(encodeURIComponent).join("/")}` : null;
}

function makeStorageKey(input: SaveFileInput) {
  const officePart = input.officeId ? `offices/${input.officeId}` : "offices/unassigned";
  const projectPart = input.projectId ? `projects/${input.projectId}` : "projects/unassigned";
  return `${officePart}/${projectPart}/${uniqueFileName(input.originalName)}`;
}

async function saveCloud(input: SaveFileInput, providerName: "r2" | "s3"): Promise<StoredFile> {
  const config = getCloudConfig(providerName);
  const client = createCloudClient(config);
  const storageKey = makeStorageKey(input);
  const contentType = input.mimeType || "application/octet-stream";
  const hash = checksum(input.buffer);
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: storageKey,
    Body: input.buffer,
    ContentType: contentType,
    ChecksumSHA256: Buffer.from(hash, "hex").toString("base64"),
  }));
  return {
    provider: providerName,
    fileName: path.basename(storageKey),
    filePath: `/files/download/${encodeURIComponent(storageKey)}`,
    fileUrl: publicFileUrl(config.publicBaseUrl, storageKey),
    storageKey,
    bucketName: config.bucket,
    contentType,
    checksum: hash,
  };
}

export async function saveUploadedFile(input: SaveFileInput): Promise<StoredFile> {
  if (provider === "r2") return saveCloud(input, "r2");
  if (provider === "s3") return saveCloud(input, "s3");
  return saveLocal(input);
}

export async function deleteStoredFile(input: DeleteFileInput): Promise<void> {
  const currentProvider = (input.provider || "local").toLowerCase();
  if (currentProvider === "r2" || currentProvider === "s3") {
    const config = getCloudConfig(currentProvider);
    const key = input.storageKey || input.fileName;
    if (!key) return;
    await createCloudClient(config).send(new DeleteObjectCommand({
      Bucket: input.bucketName || config.bucket,
      Key: key,
    }));
    return;
  }
  if (currentProvider !== "local") return;
  const fileName = input.fileName || path.basename(input.filePath || "");
  if (!fileName) return;
  const absolutePath = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(absolutePath)) {
    await fs.promises.unlink(absolutePath);
  }
}

export async function getStoredFileDownloadUrl(input: { provider?: string | null; storageKey?: string | null; bucketName?: string | null; fileUrl?: string | null }) {
  const currentProvider = (input.provider || "local").toLowerCase();
  if (input.fileUrl) return input.fileUrl;
  if (currentProvider !== "r2" && currentProvider !== "s3") return null;
  if (!input.storageKey) throw new Error("Cloud file is missing storage_key");
  const config = getCloudConfig(currentProvider);
  const expiresIn = Number(process.env["R2_SIGNED_URL_EXPIRES_SECONDS"] || "900");
  return getSignedUrl(
    createCloudClient(config),
    new GetObjectCommand({ Bucket: input.bucketName || config.bucket, Key: input.storageKey }),
    { expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 900 },
  );
}

export async function getStorageHealth(checkConnection = false): Promise<StorageHealth> {
  if (provider === "local") {
    return { provider, bucketConfigured: false, endpointConfigured: false, bucketName: null, endpoint: null, canConnect: null };
  }
  try {
    const config = getCloudConfig(provider);
    if (!checkConnection) {
      return { provider, bucketConfigured: Boolean(config.bucket), endpointConfigured: Boolean(config.endpoint), bucketName: config.bucket, endpoint: config.endpoint, canConnect: null };
    }
    await createCloudClient(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
    return { provider, bucketConfigured: true, endpointConfigured: true, bucketName: config.bucket, endpoint: config.endpoint, canConnect: true };
  } catch (err) {
    return { provider, bucketConfigured: false, endpointConfigured: false, bucketName: null, endpoint: null, canConnect: false, error: err instanceof Error ? err.message : "Storage health check failed" };
  }
}

export function getStorageProvider(): StorageProvider {
  return provider;
}

export function logStorageStartup() {
  if (provider === "local") {
    logger.info({ provider, uploadsDir: UPLOADS_DIR }, "Storage provider configured");
    return;
  }
  try {
    const config = getCloudConfig(provider);
    logger.info({ provider, bucket: config.bucket, endpoint: config.endpoint }, "Storage provider configured");
  } catch (err) {
    logger.error({ provider, err: err instanceof Error ? err.message : err }, "Storage provider configuration error");
  }
}
