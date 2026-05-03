import { db } from "@workspace/db";
import { officesTable, subscriptionPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOfficeSubscription(officeId: number) {
  const rows = await db
    .select({
      officeId: officesTable.id,
      subscriptionStatus: officesTable.subscriptionStatus,
      planId: officesTable.planId,
      planName: subscriptionPlansTable.nameAr,
      maxUsers: subscriptionPlansTable.maxUsers,
      maxProjects: subscriptionPlansTable.maxProjects,
      maxClients: subscriptionPlansTable.maxClients,
      storageLimitMb: subscriptionPlansTable.storageLimitMb,
      hasClientPortal: subscriptionPlansTable.hasClientPortal,
      hasPdfReports: subscriptionPlansTable.hasPdfReports,
      hasTeamRoles: subscriptionPlansTable.hasTeamRoles,
      hasAdvancedEstimates: subscriptionPlansTable.hasAdvancedEstimates,
    })
    .from(officesTable)
    .leftJoin(subscriptionPlansTable, eq(officesTable.planId, subscriptionPlansTable.id))
    .where(eq(officesTable.id, officeId))
    .limit(1);

  return rows[0] ?? null;
}

export async function requireActiveSubscription(officeId: number) {
  const subscription = await getOfficeSubscription(officeId);
  if (!subscription) {
    throw new Error("المكتب غير موجود");
  }
  if (subscription.subscriptionStatus !== "active" && subscription.subscriptionStatus !== "trial") {
    throw new Error("الاشتراك غير نشط");
  }
  return subscription;
}