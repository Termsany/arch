import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchNotifications, markNotificationRead, renderNotificationText, type AppNotification } from "@/lib/notifications";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/language-context";
import { defaultLanguage, translations, type TranslationKey } from "@/i18n/translations";

function timeLabel(value: string) {
  return new Date(value).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const { direction, formatRelativeDate, t } = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = () => {
    fetchNotifications(5)
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  const handleRead = async (notification: AppNotification) => {
    if (notification.isRead) return;
    try {
      await markNotificationRead(notification.id);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.updateError"), variant: "destructive" });
    }
  };

  const translateDynamic = (key: string) =>
    key in translations[defaultLanguage] ? t(key as TranslationKey) : key;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.title")}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -left-1 h-5 min-w-5 px-1 text-[10px] justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0" dir={direction}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{t("notifications.title")}</h3>
          <Link href="/notifications" className="text-xs text-primary hover:underline">{t("common.details")}</Link>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("notifications.empty")}</div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleRead(notification)}
                className={`w-full text-right px-4 py-3 border-b last:border-b-0 hover:bg-muted/60 ${notification.isRead ? "bg-background" : "bg-primary/5"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{renderNotificationText(notification, "title", translateDynamic)}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeDate(notification.createdAt) || timeLabel(notification.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{renderNotificationText(notification, "message", translateDynamic)}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
