import { pgTable, serial, varchar, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectEstimatesTable = pgTable("project_estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  phaseName: varchar("phase_name", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectEstimateSchema = createInsertSchema(projectEstimatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectEstimate = z.infer<typeof insertProjectEstimateSchema>;
export type ProjectEstimate = typeof projectEstimatesTable.$inferSelect;
