import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Users, FolderOpen, CreditCard, Building2, Tag, LogOut, Menu, BookOpen, BadgeCheck, Bell, ClipboardList, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { NotificationBell } from "@/components/notification-bell";

const ALL_NAV_ITEMS = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, superAdminOnly: false, officeOnly: false },
  { href: "/clients", label: "العملاء", icon: Users, superAdminOnly: false, officeOnly: false },
  { href: "/projects", label: "المشاريع", icon: FolderOpen, superAdminOnly: false, officeOnly: false },
  { href: "/tasks", label: "المهام", icon: ClipboardList, superAdminOnly: false, officeOnly: false },
  { href: "/invoices", label: "الفواتير والمدفوعات", icon: Receipt, superAdminOnly: false, officeOnly: false },
  { href: "/boq-library", label: "مكتبة المقايسة", icon: BookOpen, superAdminOnly: false, officeOnly: false },
  { href: "/notifications", label: "الإشعارات", icon: Bell, superAdminOnly: false, officeOnly: false },
  { href: "/subscription", label: "اشتراكي", icon: BadgeCheck, superAdminOnly: false, officeOnly: true },
  { href: "/plans", label: "خطط الاشتراك", icon: CreditCard, superAdminOnly: true, officeOnly: false },
  { href: "/offices", label: "المكاتب", icon: Building2, superAdminOnly: true, officeOnly: false },
  { href: "/pricing", label: "صفحة الأسعار", icon: Tag, superAdminOnly: false, officeOnly: false },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const isSuperAdmin = (user as { role?: string } | null)?.role === "super_admin";

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.officeOnly && isSuperAdmin) return false;
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
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="pb-8">
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={logout}>
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </Button>
      </div>
    </nav>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const roleBadge = (user as { role?: string } | null)?.role === "super_admin" ? "مدير النظام" : "مدير مكتب";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-l h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-border font-bold text-2xl text-primary gap-2">
        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold">A</div>
        ArchSaaS
      </div>
      <div className="px-4 pt-3">
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{roleBadge}</span>
      </div>
      <NavLinks />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

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
          ArchSaaS
        </div>
        <NavLinks onClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  if (location === "/login" || location === "/pricing") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col w-full h-full min-w-0">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-card border-b border-border z-10 sticky top-0">
          <MobileSidebar />
          <div className="flex items-center gap-4 mr-auto">
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
