import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectStagesTable = pgTable("project_stages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stageOrder: integer("stage_order").notNull(),
  stageName: varchar("stage_name", { length: 200 }).notNull(),
  status: varchar("status", { length: 100 }).notNull().default("لم تبدأ"),
  notes: text("notes"),
  clientFeedback: text("client_feedback"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectStageSchema = createInsertSchema(projectStagesTable).omit({ id: true, updatedAt: true });
export type InsertProjectStage = z.infer<typeof insertProjectStageSchema>;
export type ProjectStage = typeof projectStagesTable.$inferSelect;
