import { pgTable, serial, varchar, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subscriptionPlansTable } from "./subscriptionPlans";

export const officesTable = pgTable("offices", {
  id: serial("id").primaryKey(),
  officeName: varchar("office_name", { length: 150 }).notNull(),
  ownerName: varchar("owner_name", { length: 150 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 150 }),
  address: text("address"),
  planId: integer("plan_id").references(() => subscriptionPlansTable.id, { onDelete: "set null" }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).notNull().default("trial"),
  subscriptionStart: date("subscription_start"),
  subscriptionEnd: date("subscription_end"),
  region: varchar("region", { length: 20 }).notNull().default("EG"),
  defaultLanguage: varchar("default_language", { length: 10 }).notNull().default("ar"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("Africa/Cairo"),
  currency: varchar("currency", { length: 3 }).notNull().default("EGP"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOfficeSchema = createInsertSchema(officesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
export type Office = typeof officesTable.$inferSelect;
