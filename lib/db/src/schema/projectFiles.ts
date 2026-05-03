import { pgTable, serial, integer, varchar, text, bigint, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { projectStagesTable } from "./projectStages";

export const fileVisibilityEnum = pgEnum("file_visibility", ["internal", "client_visible"]);

export const projectFilesTable = pgTable("project_files", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id"),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").references(() => projectStagesTable.id, { onDelete: "set null" }),
  uploadedBy: integer("uploaded_by"),
  fileName: varchar("file_name", { length: 300 }).notNull(),
  originalName: varchar("original_name", { length: 300 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  visibility: fileVisibilityEnum("visibility").notNull().default("internal"),
  fileCategory: varchar("file_category", { length: 100 }).notNull().default("Other"),
  notes: text("notes"),
  isApprovedVersion: boolean("is_approved_version").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectFileSchema = createInsertSchema(projectFilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFilesTable.$inferSelect;
