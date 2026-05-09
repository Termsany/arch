import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/language-context";
import { completePasswordChange } from "@/lib/admin-users";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function isPasswordStrong(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export default function ChangePasswordRequired() {
  const { direction, t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isPasswordStrong(newPassword)) {
      toast({ title: t("adminCredentials.passwordTooWeak"), variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: t("adminCredentials.passwordMismatch"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await completePasswordChange(newPassword);
      queryClient.setQueryData(getGetMeQueryKey(), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        return { ...old, mustChangePassword: false };
      });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: t("auth.passwordChangedSuccess") });
      setLocation("/dashboard");
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("error.tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={direction}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.mustChangePasswordTitle")}</CardTitle>
          <CardDescription>{t("auth.mustChangePasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="required-new-password">{t("adminCredentials.newPassword")}</Label>
              <Input
                id="required-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="required-confirm-password">{t("adminCredentials.confirmPassword")}</Label>
              <Input
                id="required-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {t("auth.completePasswordChange")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
