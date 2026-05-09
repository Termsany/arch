import { Redirect } from "wouter";
import { AppLayout } from "@/components/layout";
import { AdminPasswordResetForm } from "@/components/admin-password-reset-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n/language-context";

export default function AdminCredentials() {
  const { user } = useAuth();
  const { direction, t } = useTranslation();
  const role = (user as { role?: string } | null)?.role;
  const currentEmail = (user as { email?: string } | null)?.email ?? "";

  if (role !== "super_admin") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold">{t("adminCredentials.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("adminCredentials.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminCredentials.resetAnyUser")}</CardTitle>
            <CardDescription>{t("adminCredentials.resetAnyUserDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPasswordResetForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminCredentials.currentSuperAdmin")}</CardTitle>
            <CardDescription>{t("adminCredentials.currentSuperAdminDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPasswordResetForm initialEmail={currentEmail} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
