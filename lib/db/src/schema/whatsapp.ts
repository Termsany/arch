import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { invoicesTable } from "./invoices";
import { officesTable } from "./offices";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", ["pending", "sent", "failed", "simulated"]);

export const whatsappTemplatesTable = pgTable(
  "whatsapp_templates",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id").references(() => officesTable.id, { onDelete: "cascade" }),
    templateKey: varchar("template_key", { length: 100 }).notNull(),
    nameAr: varchar("name_ar", { length: 200 }).notNull(),
    messageBody: text("message_body").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_templates_office_id_idx").on(table.officeId),
    index("whatsapp_templates_key_idx").on(table.templateKey),
  ],
);

export const whatsappMessagesTable = pgTable(
  "whatsapp_messages",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id").notNull().references(() => officesTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
    clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
    invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
    phone: varchar("phone", { length: 50 }).notNull(),
    messageBody: text("message_body").notNull(),
    messageType: varchar("message_type", { length: 80 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 200 }),
    status: whatsappMessageStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    sentBy: integer("sent_by").references(() => usersTable.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_messages_office_id_idx").on(table.officeId),
    index("whatsapp_messages_project_id_idx").on(table.projectId),
    index("whatsapp_messages_client_id_idx").on(table.clientId),
    index("whatsapp_messages_invoice_id_idx").on(table.invoiceId),
    index("whatsapp_messages_status_idx").on(table.status),
    index("whatsapp_messages_type_idx").on(table.messageType),
  ],
);

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type WhatsappTemplate = typeof whatsappTemplatesTable.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
