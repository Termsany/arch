import { pgTable, serial, varchar, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";
import { boqCategoriesTable } from "./boqCategories";

export const boqItemsLibraryTable = pgTable("boq_items_library", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id").references(() => officesTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => boqCategoriesTable.id, { onDelete: "set null" }),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  defaultUnit: varchar("default_unit", { length: 50 }),
  defaultMaterialCost: numeric("default_material_cost", { precision: 10, scale: 2 }).default("0"),
  defaultLaborCost: numeric("default_labor_cost", { precision: 10, scale: 2 }).default("0"),
  defaultWastePercentage: numeric("default_waste_percentage", { precision: 5, scale: 2 }).default("0"),
  defaultProfitMargin: numeric("default_profit_margin", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBoqItemLibrarySchema = createInsertSchema(boqItemsLibraryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoqItemLibrary = z.infer<typeof insertBoqItemLibrarySchema>;
export type BoqItemLibrary = typeof boqItemsLibraryTable.$inferSelect;
