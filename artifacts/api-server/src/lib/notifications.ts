import { db, notificationsTable } from "@workspace/db";
import { and, eq, isNull, or } from "drizzle-orm";

export type NotificationInput = {
  officeId?: number | null;
  userId?: number | null;
  clientId?: number | null;
  projectId?: number | null;
  title: string;
  message: string;
  notificationType: string;
};

export async function createNotification(input: NotificationInput) {
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      officeId: input.officeId ?? null,
      userId: input.userId ?? null,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      title: input.title,
      message: input.message,
      notificationType: input.notificationType,
    })
    .returning();

  return notification!;
}

export async function markAsRead(notificationId: number) {
  const [notification] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, notificationId))
    .returning();

  return notification ?? null;
}

export async function markAllAsRead(scope: { officeId?: number | null; userId?: number | null; clientId?: number | null; superAdmin?: boolean }) {
  if (scope.superAdmin) {
    await db.update(notificationsTable).set({ isRead: true });
    return;
  }

  if (scope.clientId) {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.clientId, scope.clientId));
    return;
  }

  if (scope.officeId) {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.officeId, scope.officeId),
          scope.userId
            ? or(isNull(notificationsTable.userId), eq(notificationsTable.userId, scope.userId))
            : isNull(notificationsTable.userId),
        ),
      );
  }
}
