import type { Request } from "express";
import { auditLogsTable, db } from "@workspace/db";
import { logger } from "./logger";

const SENSITIVE_KEYS = [
  "password",
  "password_hash",
  "passwordhash",
  "token",
  "access_token",
  "accesstoken",
  "secret",
  "jwt",
  "api_key",
  "apikey",
  "r2_secret_access_key",
  "whatsapp_access_token",
  "database_url",
];

type Jsonish = null | string | number | boolean | Jsonish[] | { [key: string]: Jsonish };

export interface AuditInput {
  office_id?: number | null;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  old_value?: unknown;
  new_value?: unknown;
  req?: Request;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

function redact(value: unknown, seen = new WeakSet<object>()): Jsonish {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  const output: Record<string, Jsonish> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? "[REDACTED]" : redact(child, seen);
  }
  return output;
}

export function redactAuditValue(value: unknown): Jsonish {
  return redact(value);
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      officeId: input.office_id ?? null,
      userId: input.user_id ?? null,
      action: input.action,
      entityType: input.entity_type,
      entityId: input.entity_id ?? null,
      oldValue: input.old_value === undefined ? null : redactAuditValue(input.old_value),
      newValue: input.new_value === undefined ? null : redactAuditValue(input.new_value),
      ipAddress: input.req?.ip ?? null,
      userAgent: input.req?.headers["user-agent"] ?? null,
    });
  } catch (err) {
    logger.warn({ err, action: input.action, entityType: input.entity_type }, "Audit logging failed");
  }
}
