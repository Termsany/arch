import { pgTable, serial, varchar, text, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  officeId: integer("office_id"),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  designType: varchar("design_type", { length: 100 }).notNull(),
  areaMeters: numeric("area_meters", { precision: 10, scale: 2 }),
  pricePerMeter: numeric("price_per_meter", { precision: 10, scale: 2 }),
  totalDesignPrice: numeric("total_design_price", { precision: 10, scale: 2 }),
  projectStatus: varchar("project_status", { length: 100 }).notNull().default("جديد"),
  startDate: date("start_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
