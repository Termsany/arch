import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Users, FolderOpen, Database, Building2, CreditCard, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { parseApiResponse } from "@/lib/api-response";
import { useTranslation } from "@/i18n/language-context";
import type { TranslationKey } from "@/i18n/translations";

interface SubscriptionInfo {
  isSuperAdmin: boolean;
  officeId?: number;
  officeName?: string;
  subscriptionStatus?: string;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  planId?: number | null;
  planName?: string | null;
  monthlyPrice?: string | null;
  maxUsers?: number;
  maxProjects?: number;
  maxClients?: number;
  storageLimitMb?: number;
  hasClientPortal?: boolean;
  hasPdfReports?: boolean;
  hasTeamRoles?: boolean;
  hasAdvancedEstimates?: boolean;
  hasWhatsappNotifications?: boolean;
  currentProjects?: number;
  currentClients?: number;
}

const STATUS_MAP: Record<string, { labelKey: TranslationKey; color: string }> = {
  trial: { labelKey: "subscription.status.trial", color: "bg-blue-100 text-blue-800 border-blue-200" },
  active: { labelKey: "subscription.status.active", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  expired: { labelKey: "subscription.status.expired", color: "bg-orange-100 text-orange-800 border-orange-200" },
  cancelled: { labelKey: "subscription.status.cancelled", color: "bg-rose-100 text-rose-800 border-rose-200" },
};

function LimitBar({ label, current, max, icon: Icon, formatNumber }: { label: string; current: number; max: number; icon: React.ElementType; formatNumber: (value: number) => string }) {
  const unlimited = max === 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
  const nearLimit = !unlimited && pct >= 80;
  const atLimit = !unlimited && current >= max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />{label}
        </span>
        <span className={`font-medium ${atLimit ? "text-destructive" : nearLimit ? "text-orange-600" : "text-foreground"}`}>
          {formatNumber(current)} / {unlimited ? "∞" : formatNumber(max)}
        </span>
      </div>
      {!unlimited && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : nearLimit ? "bg-orange-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${enabled ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-muted border-border text-muted-foreground"}`}>
      {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
      {label}
    </div>
  );
}

export default function Subscription() {
  const { t, direction, formatDate, formatCurrency, formatNumber } = useTranslation();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/subscription/my", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => parseApiResponse<SubscriptionInfo>(r))
      .then(setInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-6 p-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !info) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto p-8 text-center text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive opacity-60" />
          <p>{error || t("subscription.notFound")}</p>
        </div>
      </AppLayout>
    );
  }

  if (info.isSuperAdmin) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-primary opacity-70" />
          <h2 className="text-xl font-bold mb-2">{t("subscription.superAdminTitle")}</h2>
          <p className="text-muted-foreground mb-6">{t("subscription.superAdminDescription")}</p>
          <Link href="/plans">
            <Button variant="outline">{t("subscription.managePlans")}</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const statusInfo = STATUS_MAP[info.subscriptionStatus ?? ""] ?? { labelKey: "subscription.status.unknown" as TranslationKey, color: "bg-muted text-muted-foreground" };
  const isBlocked = info.subscriptionStatus === "expired" || info.subscriptionStatus === "cancelled";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" dir={direction}>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("subscription.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subscription.subtitle")}</p>
        </div>

        {isBlocked && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{t("subscription.blockedMessage")}</span>
          </div>
        )}

        {/* Plan Overview */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {info.planName ?? t("subscription.noPlan")}
                </CardTitle>
                <CardDescription className="mt-1">{info.officeName}</CardDescription>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                {t(statusInfo.labelKey)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {info.subscriptionStart && (
              <div className="flex justify-between">
                <span>{t("subscription.startDate")}</span>
                <span dir="ltr" className="text-foreground">{formatDate(info.subscriptionStart)}</span>
              </div>
            )}
            {info.subscriptionEnd && (
              <div className="flex justify-between">
                <span>{t("subscription.endDate")}</span>
                <span dir="ltr" className="text-foreground">{formatDate(info.subscriptionEnd)}</span>
              </div>
            )}
            {info.monthlyPrice && (
              <div className="flex justify-between">
                <span>{t("subscription.monthlyPrice")}</span>
                <span dir="ltr" className="text-foreground font-medium">{formatCurrency(Number(info.monthlyPrice))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        {info.planId && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("subscription.currentUsage")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LimitBar label={t("subscription.projects")} current={info.currentProjects ?? 0} max={info.maxProjects ?? 0} icon={FolderOpen} formatNumber={formatNumber} />
              <LimitBar label={t("subscription.clients")} current={info.currentClients ?? 0} max={info.maxClients ?? 0} icon={Users} formatNumber={formatNumber} />
              <LimitBar label={t("subscription.storageMb")} current={0} max={info.storageLimitMb ?? 0} icon={Database} formatNumber={formatNumber} />
            </CardContent>
          </Card>
        )}

        {/* Features */}
        {info.planId && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("subscription.availableFeatures")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FeaturePill label={t("subscription.clientPortal")} enabled={info.hasClientPortal ?? false} />
                <FeaturePill label={t("subscription.pdfReports")} enabled={info.hasPdfReports ?? false} />
                <FeaturePill label={t("subscription.teamRoles")} enabled={info.hasTeamRoles ?? false} />
                <FeaturePill label={t("subscription.advancedEstimates")} enabled={info.hasAdvancedEstimates ?? false} />
                <FeaturePill label={t("subscription.whatsappNotifications")} enabled={info.hasWhatsappNotifications ?? false} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-2">
          <Link href="/pricing">
            <Button variant="outline" className="gap-2">
              <CreditCard className="w-4 h-4" />
              {t("subscription.compareUpgrade")}
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
