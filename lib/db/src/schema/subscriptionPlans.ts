import { pgTable, serial, varchar, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  descriptionAr: text("description_ar"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUsers: integer("max_users").notNull().default(1),
  maxProjects: integer("max_projects").notNull().default(0),
  maxClients: integer("max_clients").notNull().default(0),
  storageLimitMb: integer("storage_limit_mb").notNull().default(0),
  hasClientPortal: boolean("has_client_portal").notNull().default(false),
  hasWhatsappNotifications: boolean("has_whatsapp_notifications").notNull().default(false),
  hasPdfReports: boolean("has_pdf_reports").notNull().default(false),
  hasTeamRoles: boolean("has_team_roles").notNull().default(false),
  hasAdvancedEstimates: boolean("has_advanced_estimates").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
