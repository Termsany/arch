import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { projectStagesTable } from "./projectStages";

export const clientFeedbackTable = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").references(() => projectStagesTable.id, { onDelete: "set null" }),
  feedbackText: text("feedback_text").notNull(),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientFeedbackSchema = createInsertSchema(clientFeedbackTable).omit({ id: true, createdAt: true });
export type InsertClientFeedback = z.infer<typeof insertClientFeedbackSchema>;
export type ClientFeedback = typeof clientFeedbackTable.$inferSelect;
