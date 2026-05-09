import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Users, FolderOpen, CreditCard, Building2, Tag, LogOut, Menu, BookOpen, BadgeCheck, Bell, ClipboardList, Receipt, BarChart3, MessageCircle, ScrollText, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { useTranslation } from "@/i18n/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { APP_MODULES, type AppModuleKey } from "@/lib/modules";
import { fetchMyModules } from "@/lib/module-access";
import { getOfficeBranding, updateFavicon } from "@/lib/branding";

const MODULE_ICONS = {
  dashboard: LayoutDashboard,
  clients: Users,
  projects: FolderOpen,
  tasks: ClipboardList,
  invoices: Receipt,
  reports: BarChart3,
  audit_logs: ScrollText,
  whatsapp: MessageCircle,
  boq_library: BookOpen,
  notifications: Bell,
  subscription: BadgeCheck,
  plans: CreditCard,
  offices: Building2,
  credentials: KeyRound,
  pricing: Tag,
} satisfies Record<AppModuleKey, typeof LayoutDashboard>;

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const role = (user as { role?: string; office?: unknown } | null)?.role;
  const branding = getOfficeBranding((user as { office?: Parameters<typeof getOfficeBranding>[0] } | null)?.office);
  const isSuperAdmin = role === "super_admin";
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadModules = () => {
      if (!user) {
        setEnabledModules(null);
        return;
      }

      fetchMyModules()
        .then((data) => {
          if (!cancelled) setEnabledModules(data.enabledModules);
        })
        .catch(() => {
          if (!cancelled) setEnabledModules(["dashboard"]);
        });
    };

    loadModules();
    window.addEventListener("modules:updated", loadModules);
    return () => {
      cancelled = true;
      window.removeEventListener("modules:updated", loadModules);
    };
  }, [user]);

  const enabledSet = new Set(enabledModules ?? ["dashboard"]);

  const navItems = APP_MODULES.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.officeOnly && isSuperAdmin) return false;
    if ("adminOnly" in item && item.adminOnly && !isSuperAdmin && role !== "office_admin") return false;
    if (!isSuperAdmin && !enabledSet.has(item.key)) return false;
    return true;
  });

  return (
    <nav className="space-y-1 mt-8 flex flex-col w-full px-4 h-full">
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = MODULE_ICONS[item.key];
          const isActive = location === item.href || location.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                style={isActive ? { backgroundColor: `${branding.brandColor}18`, color: branding.brandColor } : undefined}
              >
                <Icon className="w-5 h-5" />
                {t(item.labelKey)}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="pb-8">
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={logout}>
          <LogOut className="w-5 h-5" />
          {t("auth.logout")}
        </Button>
      </div>
    </nav>
  );
}

function BrandHeader() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const branding = getOfficeBranding((user as { office?: Parameters<typeof getOfficeBranding>[0] } | null)?.office);
  const displayName = branding.officeName || t("app.name");

  useEffect(() => {
    updateFavicon(branding.faviconUrl);
  }, [branding.faviconUrl]);

  return (
    <div className="h-16 flex items-center px-6 border-b border-border font-bold text-xl text-primary gap-2">
      {branding.logoUrl ? (
        <img src={branding.logoUrl} alt={displayName} className="w-9 h-9 rounded object-contain bg-background border border-border" />
      ) : (
        <div
          className="w-9 h-9 rounded flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: branding.brandColor }}
        >
          {displayName[0]?.toUpperCase() || "A"}
        </div>
      )}
      <span className="truncate">{displayName}</span>
    </div>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const roleBadge = (user as { role?: string } | null)?.role === "super_admin"
    ? t("role.superAdmin")
    : t("role.officeAdmin");

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-l h-screen sticky top-0">
      <BrandHeader />
      <div className="px-4 pt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{roleBadge}</span>
      </div>
      <NavLinks />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-64 flex flex-col h-full">
        <BrandHeader />
        <NavLinks onClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { direction } = useTranslation();
  const branding = getOfficeBranding((user as { office?: Parameters<typeof getOfficeBranding>[0] } | null)?.office);

  if (location === "/" || location === "/login" || location === "/client/login" || location === "/pricing" || location === "/start" || location === "/set-password") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background" dir={direction}>
      <Sidebar />
      <div className="flex-1 flex flex-col w-full h-full min-w-0">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-card border-b border-border z-10 sticky top-0" style={{ borderTop: `3px solid ${branding.brandColor}` }}>
          <div className="flex items-center gap-3">
            <MobileSidebar />
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm font-medium">{(user as { name?: string } | null)?.name}</div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {(user as { name?: string } | null)?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
