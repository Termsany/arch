import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type StorageProvider = "local" | "s3";

export interface StoredFile {
  provider: StorageProvider;
  fileName: string;
  filePath: string;
  fileUrl: string | null;
}

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface DeleteFileInput {
  provider?: string | null;
  fileName: string;
  filePath?: string | null;
}

export const UPLOADS_DIR = process.env["UPLOAD_DIR"]
  ? path.resolve(process.env["UPLOAD_DIR"])
  : path.resolve(__dirname, "../../uploads");

const provider = (process.env["STORAGE_PROVIDER"] || "local").toLowerCase() as StorageProvider;

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function uniqueFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
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
  };
}

async function saveS3(_input: SaveFileInput): Promise<StoredFile> {
  const required = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`S3 storage is not configured. Missing: ${missing.join(", ")}`);
  }
  throw new Error("S3 storage provider is configured as a placeholder. Add an S3 client implementation before enabling it in production.");
}

export async function saveUploadedFile(input: SaveFileInput): Promise<StoredFile> {
  if (provider === "s3") return saveS3(input);
  return saveLocal(input);
}

export async function deleteStoredFile(input: DeleteFileInput): Promise<void> {
  const currentProvider = (input.provider || "local").toLowerCase();
  if (currentProvider !== "local") {
    return;
  }
  const fileName = input.fileName || path.basename(input.filePath || "");
  if (!fileName) return;
  const absolutePath = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(absolutePath)) {
    await fs.promises.unlink(absolutePath);
  }
}

export function getStorageProvider(): StorageProvider {
  return provider === "s3" ? "s3" : "local";
}
