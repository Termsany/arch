import { useState } from "react";
import { Copy, KeyRound, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/language-context";
import { resetUserPassword } from "@/lib/admin-users";
import { generateStrongPassword } from "@/lib/password-generator";

type AdminPasswordResetFormProps = {
  initialEmail?: string;
  onSuccess?: () => void;
};

function isPasswordStrong(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function AdminPasswordResetForm({ initialEmail = "", onSuccess }: AdminPasswordResetFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forceChange, setForceChange] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatePassword = () => {
    const generated = generateStrongPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    toast({ title: t("adminCredentials.passwordCopied") });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({ title: t("adminCredentials.emailRequired"), variant: "destructive" });
      return;
    }

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
      await resetUserPassword({ email: normalizedEmail, newPassword, forceChange });
      toast({ title: t("adminCredentials.success") });
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("error.tryAgain"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-reset-email">{t("adminCredentials.email")}</Label>
        <Input
          id="admin-reset-email"
          type="email"
          dir="ltr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="admin-reset-password">{t("adminCredentials.newPassword")}</Label>
          <Input
            id="admin-reset-password"
            type="text"
            dir="ltr"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-reset-confirm">{t("adminCredentials.confirmPassword")}</Label>
          <Input
            id="admin-reset-confirm"
            type="text"
            dir="ltr"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="gap-2" onClick={generatePassword}>
          <Wand2 className="w-4 h-4" />
          {t("adminCredentials.generatePassword")}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={copyPassword} disabled={!newPassword}>
          <Copy className="w-4 h-4" />
          {t("adminCredentials.copyPassword")}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={forceChange} onCheckedChange={(checked) => setForceChange(Boolean(checked))} />
        {t("adminCredentials.forceChange")}
      </label>

      <Button type="submit" className="gap-2" disabled={isSubmitting}>
        <KeyRound className="w-4 h-4" />
        {t("adminCredentials.submit")}
      </Button>
    </form>
  );
}
