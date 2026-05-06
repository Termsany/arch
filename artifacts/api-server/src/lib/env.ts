type EnvConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  uploadDir: string;
  storageProvider: "local" | "r2" | "s3";
};

let cachedEnv: EnvConfig | null = null;

function read(name: string) {
  return process.env[name]?.trim() || "";
}

function missingVarNames() {
  const missing = new Set<string>();
  const storageProvider = (read("STORAGE_PROVIDER") || "local").toLowerCase();
  const whatsappEnabled = read("WHATSAPP_ENABLED") === "true";
  const whatsappProvider = read("WHATSAPP_PROVIDER") || "simulation";

  const baseRequired = ["PORT", "JWT_SECRET", "FRONTEND_URL"];
  for (const name of baseRequired) {
    if (!read(name)) missing.add(name);
  }

  if (!read("DATABASE_URL")) {
    for (const name of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
      if (!read(name)) missing.add(name);
    }
  }

  if (storageProvider === "local") {
    if (!read("UPLOAD_DIR")) missing.add("UPLOAD_DIR");
  }

  if (storageProvider === "r2") {
    for (const name of ["R2_BUCKET", "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
      if (!read(name)) missing.add(name);
    }
  }

  if (storageProvider === "s3") {
    for (const name of ["S3_BUCKET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
      if (!read(name)) missing.add(name);
    }
  }

  if (whatsappEnabled && whatsappProvider === "whatsapp_cloud") {
    for (const name of ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_BUSINESS_ACCOUNT_ID"]) {
      if (!read(name)) missing.add(name);
    }
  }

  return [...missing];
}

export function validateEnv() {
  const missing = missingVarNames();
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const port = Number(read("PORT"));
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid environment variable: PORT");
  }

  const storageProvider = (read("STORAGE_PROVIDER") || "local").toLowerCase();
  if (!["local", "r2", "s3"].includes(storageProvider)) {
    throw new Error("Invalid environment variable: STORAGE_PROVIDER");
  }

  cachedEnv = {
    nodeEnv: read("NODE_ENV") || "development",
    port,
    databaseUrl: read("DATABASE_URL"),
    jwtSecret: read("JWT_SECRET"),
    jwtExpiresIn: read("JWT_EXPIRES_IN") || "7d",
    frontendUrl: read("FRONTEND_URL"),
    uploadDir: read("UPLOAD_DIR"),
    storageProvider: storageProvider as EnvConfig["storageProvider"],
  };

  return cachedEnv;
}

export function getEnv() {
  return cachedEnv ?? validateEnv();
}
