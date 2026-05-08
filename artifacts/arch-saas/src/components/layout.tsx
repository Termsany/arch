import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Users, FolderOpen, CreditCard, Building2, Tag, LogOut, Menu, BookOpen, BadgeCheck, Bell, ClipboardList, Receipt, BarChart3, MessageCircle, ScrollText, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { useTranslation } from "@/i18n/language-context";

const ALL_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, superAdminOnly: false, officeOnly: false },
  { href: "/clients", labelKey: "nav.clients", icon: Users, superAdminOnly: false, officeOnly: false },
  { href: "/projects", labelKey: "nav.projects", icon: FolderOpen, superAdminOnly: false, officeOnly: false },
  { href: "/tasks", labelKey: "nav.tasks", icon: ClipboardList, superAdminOnly: false, officeOnly: false },
  { href: "/invoices", labelKey: "nav.invoices", icon: Receipt, superAdminOnly: false, officeOnly: false },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart3, superAdminOnly: false, officeOnly: false },
  { href: "/audit-logs", labelKey: "nav.auditLogs", icon: ScrollText, superAdminOnly: false, officeOnly: false, adminOnly: true },
  { href: "/whatsapp", labelKey: "nav.whatsapp", icon: MessageCircle, superAdminOnly: false, officeOnly: false },
  { href: "/boq-library", labelKey: "nav.boqLibrary", icon: BookOpen, superAdminOnly: false, officeOnly: false },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell, superAdminOnly: false, officeOnly: false },
  { href: "/subscription", labelKey: "nav.subscription", icon: BadgeCheck, superAdminOnly: false, officeOnly: true },
  { href: "/plans", labelKey: "nav.plans", icon: CreditCard, superAdminOnly: true, officeOnly: false },
  { href: "/offices", labelKey: "nav.offices", icon: Building2, superAdminOnly: true, officeOnly: false },
  { href: "/pricing", labelKey: "nav.pricing", icon: Tag, superAdminOnly: false, officeOnly: false },
] as const;

function LanguageSwitcher() {
  const { language, setLanguage, languages, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-muted-foreground" />
      <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder={t("language.label")} />
        </SelectTrigger>
        <SelectContent>
          {languages.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const role = (user as { role?: string } | null)?.role;
  const isSuperAdmin = role === "super_admin";

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.officeOnly && isSuperAdmin) return false;
    if ("adminOnly" in item && item.adminOnly && !isSuperAdmin && role !== "office_admin") return false;
    return true;
  });

  return (
    <nav className="space-y-1 mt-8 flex flex-col w-full px-4 h-full">
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-secondary-foreground" : ""}`} />
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

export function Sidebar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const roleBadge = (user as { role?: string } | null)?.role === "super_admin"
    ? t("role.superAdmin")
    : t("role.officeAdmin");

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-l h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-border font-bold text-2xl text-primary gap-2">
        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold">A</div>
        {t("app.name")}
      </div>
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
        <div className="h-16 flex items-center px-6 border-b border-border font-bold text-2xl text-primary gap-2">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold">A</div>
          {t("app.name")}
        </div>
        <NavLinks onClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { direction } = useTranslation();

  if (location === "/" || location === "/login" || location === "/client/login" || location === "/pricing" || location === "/start" || location === "/set-password") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background" dir={direction}>
      <Sidebar />
      <div className="flex-1 flex flex-col w-full h-full min-w-0">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-card border-b border-border z-10 sticky top-0">
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
