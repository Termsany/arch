import { db } from "@workspace/db";
import { whatsappMessagesTable, whatsappTemplatesTable } from "@workspace/db/schema";
import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { createNotification } from "./notifications";

export const WHATSAPP_MESSAGE_TYPES = [
  "client_approval_request",
  "client_revision_update",
  "file_uploaded",
  "quotation_created",
  "invoice_created",
  "payment_reminder",
  "appointment_reminder",
  "general",
] as const;

export type WhatsappMessageType = typeof WHATSAPP_MESSAGE_TYPES[number];

type SendInput = {
  officeId: number;
  phone: string;
  messageBody: string;
  messageType: WhatsappMessageType | string;
  projectId?: number | null;
  clientId?: number | null;
  invoiceId?: number | null;
  sentBy?: number | null;
};

type TemplateVariables = Record<string, string | number | null | undefined>;

const provider = process.env["WHATSAPP_PROVIDER"] || "simulation";
const enabled = process.env["WHATSAPP_ENABLED"] === "true";
const defaultCountryCode = process.env["WHATSAPP_DEFAULT_COUNTRY_CODE"] || "20";

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  const clean = digits.replace(/^00/, "");
  if (clean.startsWith(defaultCountryCode)) return `+${clean}`;
  if (clean.startsWith("0")) return `+${defaultCountryCode}${clean.slice(1)}`;
  return `+${defaultCountryCode}${clean}`;
}

export function renderWhatsAppTemplate(messageBody: string, variables: TemplateVariables = {}): string {
  return messageBody.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_match, key: string) => String(variables[key] ?? ""));
}

export async function renderWhatsAppTemplateByKey(officeId: number | null, templateKey: string, variables: TemplateVariables = {}) {
  const templates = await db
    .select()
    .from(whatsappTemplatesTable)
    .where(
      and(
        eq(whatsappTemplatesTable.templateKey, templateKey),
        eq(whatsappTemplatesTable.isActive, true),
        officeId ? or(eq(whatsappTemplatesTable.officeId, officeId), isNull(whatsappTemplatesTable.officeId)) : isNull(whatsappTemplatesTable.officeId),
      ),
    )
    .orderBy(desc(whatsappTemplatesTable.officeId))
    .limit(1);

  const template = templates[0];
  if (!template) return null;
  return renderWhatsAppTemplate(template.messageBody, variables);
}

async function hasRecentDuplicate(input: SendInput, normalizedPhone: string): Promise<boolean> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const rows = await db
    .select({ id: whatsappMessagesTable.id })
    .from(whatsappMessagesTable)
    .where(
      and(
        eq(whatsappMessagesTable.officeId, input.officeId),
        eq(whatsappMessagesTable.phone, normalizedPhone),
        eq(whatsappMessagesTable.messageType, input.messageType),
        input.projectId ? eq(whatsappMessagesTable.projectId, input.projectId) : isNull(whatsappMessagesTable.projectId),
        input.clientId ? eq(whatsappMessagesTable.clientId, input.clientId) : isNull(whatsappMessagesTable.clientId),
        input.invoiceId ? eq(whatsappMessagesTable.invoiceId, input.invoiceId) : isNull(whatsappMessagesTable.invoiceId),
        eq(whatsappMessagesTable.messageBody, input.messageBody),
        gte(whatsappMessagesTable.createdAt, tenMinutesAgo),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function insertMessage(input: SendInput, status: "sent" | "failed" | "simulated", errorMessage?: string, providerMessageId?: string) {
  const [message] = await db
    .insert(whatsappMessagesTable)
    .values({
      officeId: input.officeId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      invoiceId: input.invoiceId ?? null,
      phone: normalizePhoneNumber(input.phone),
      messageBody: input.messageBody,
      messageType: input.messageType,
      provider,
      providerMessageId: providerMessageId ?? null,
      status,
      errorMessage: errorMessage ?? null,
      sentBy: input.sentBy ?? null,
      sentAt: status === "sent" || status === "simulated" ? new Date() : null,
    })
    .returning();

  await createNotification({
    officeId: input.officeId,
    userId: input.sentBy ?? null,
    projectId: input.projectId ?? null,
    title: status === "failed" ? "فشل إرسال واتساب" : status === "simulated" ? "رسالة واتساب تجريبية" : "تم إرسال واتساب",
    message: status === "failed" ? `تعذر إرسال رسالة واتساب إلى ${message!.phone}` : `تم تسجيل رسالة واتساب إلى ${message!.phone}`,
    notificationType: `whatsapp_${status}`,
  }).catch(() => undefined);

  return message!;
}

async function sendViaCloudApi(input: SendInput) {
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const accessToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  if (!enabled || !phoneNumberId || !accessToken) {
    const reason = "WhatsApp Cloud credentials are missing; message stored as simulated.";
    console.info("[whatsapp:simulation]", { phone: input.phone, messageType: input.messageType, reason });
    return insertMessage(input, "simulated", reason);
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhoneNumber(input.phone).replace(/^\+/, ""),
        type: "text",
        text: { body: input.messageBody },
      }),
    });
    const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: string }>; error?: { message?: string } } | null;
    if (!response.ok) {
      return insertMessage(input, "failed", payload?.error?.message || response.statusText);
    }
    return insertMessage(input, "sent", undefined, payload?.messages?.[0]?.id);
  } catch (err) {
    return insertMessage(input, "failed", err instanceof Error ? err.message : "WhatsApp send failed");
  }
}

export async function sendWhatsAppMessage(input: SendInput) {
  if (!input.phone?.trim()) return null;
  const normalizedPhone = normalizePhoneNumber(input.phone);
  if (await hasRecentDuplicate(input, normalizedPhone)) {
    console.info("[whatsapp:duplicate-skipped]", { phone: normalizedPhone, messageType: input.messageType });
    return null;
  }

  if (!enabled || provider === "simulation") {
    console.info("[whatsapp:simulation]", {
      officeId: input.officeId,
      phone: normalizedPhone,
      messageType: input.messageType,
      messageBody: input.messageBody,
    });
    return insertMessage(input, "simulated", enabled ? undefined : "WHATSAPP_ENABLED=false; message stored as simulated.");
  }

  if (provider === "whatsapp_cloud") {
    return sendViaCloudApi(input);
  }

  return insertMessage(input, "simulated", `Unsupported provider "${provider}"; message stored as simulated.`);
}
