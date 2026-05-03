import { date, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";
import { projectsTable } from "./projects";
import { projectStagesTable } from "./projectStages";
import { usersTable } from "./users";

export const projectTaskStatusEnum = pgEnum("project_task_status", ["todo", "in_progress", "review", "done"]);
export const projectTaskPriorityEnum = pgEnum("project_task_priority", ["low", "medium", "high", "urgent"]);

export const projectTasksTable = pgTable(
  "project_tasks",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id").notNull().references(() => officesTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    stageId: integer("stage_id").references(() => projectStagesTable.id, { onDelete: "set null" }),
    assignedTo: integer("assigned_to").references(() => usersTable.id, { onDelete: "set null" }),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: projectTaskStatusEnum("status").notNull().default("todo"),
    priority: projectTaskPriorityEnum("priority").notNull().default("medium"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_tasks_office_id_idx").on(table.officeId),
    index("project_tasks_project_id_idx").on(table.projectId),
    index("project_tasks_assigned_to_idx").on(table.assignedTo),
    index("project_tasks_status_idx").on(table.status),
  ],
);

export const insertProjectTaskSchema = createInsertSchema(projectTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasksTable.$inferSelect;
