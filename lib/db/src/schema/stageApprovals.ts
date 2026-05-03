import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { projectStagesTable } from "./projectStages";
import { clientsTable } from "./clients";

export const stageApprovalsTable = pgTable("stage_approvals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").notNull().references(() => projectStagesTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  approvalStatus: varchar("approval_status", { length: 50 }).notNull().default("pending"),
  comment: text("comment"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStageApprovalSchema = createInsertSchema(stageApprovalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStageApproval = z.infer<typeof insertStageApprovalSchema>;
export type StageApproval = typeof stageApprovalsTable.$inferSelect;
