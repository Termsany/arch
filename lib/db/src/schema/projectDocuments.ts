import { index, pgEnum, pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { officesTable } from "./offices";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const projectDocumentTypeEnum = pgEnum("project_document_type", ["quotation", "project_report", "boq", "invoice"]);

export const projectDocumentsTable = pgTable(
  "project_documents",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id").notNull().references(() => officesTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    documentType: projectDocumentTypeEnum("document_type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    htmlContent: text("html_content").notNull(),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_documents_office_id_idx").on(table.officeId),
    index("project_documents_project_id_idx").on(table.projectId),
  ],
);

export const insertProjectDocumentSchema = createInsertSchema(projectDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;
export type ProjectDocument = typeof projectDocumentsTable.$inferSelect;
