import { boolean, index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { officesTable } from "./offices";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id").references(() => officesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    notificationType: varchar("notification_type", { length: 80 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_office_id_idx").on(table.officeId),
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_client_id_idx").on(table.clientId),
    index("notifications_project_id_idx").on(table.projectId),
  ],
);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
