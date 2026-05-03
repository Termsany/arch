import { pgTable, serial, varchar, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { boqCategoriesTable } from "./boqCategories";

export const projectEstimatesTable = pgTable("project_estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => boqCategoriesTable.id, { onDelete: "set null" }),
  phaseName: varchar("phase_name", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  materialUnitCost: numeric("material_unit_cost", { precision: 10, scale: 2 }).default("0"),
  laborUnitCost: numeric("labor_unit_cost", { precision: 10, scale: 2 }).default("0"),
  wastePercentage: numeric("waste_percentage", { precision: 5, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).default("0"),
  unitCostBeforeProfit: numeric("unit_cost_before_profit", { precision: 10, scale: 2 }).default("0"),
  totalCostBeforeProfit: numeric("total_cost_before_profit", { precision: 10, scale: 2 }).default("0"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectEstimateSchema = createInsertSchema(projectEstimatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectEstimate = z.infer<typeof insertProjectEstimateSchema>;
export type ProjectEstimate = typeof projectEstimatesTable.$inferSelect;
