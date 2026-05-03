import { boolean, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";

export const officeSettingsTable = pgTable("office_settings", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id").notNull().references(() => officesTable.id, { onDelete: "cascade" }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOfficeSettingsSchema = createInsertSchema(officeSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOfficeSettings = z.infer<typeof insertOfficeSettingsSchema>;
export type OfficeSettings = typeof officeSettingsTable.$inferSelect;
