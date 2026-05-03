import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";

export const boqCategoriesTable = pgTable("boq_categories", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id").references(() => officesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBoqCategorySchema = createInsertSchema(boqCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoqCategory = z.infer<typeof insertBoqCategorySchema>;
export type BoqCategory = typeof boqCategoriesTable.$inferSelect;
