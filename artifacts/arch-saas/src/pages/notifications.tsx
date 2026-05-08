import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  renderNotificationText,
  type AppNotification,
} from "@/lib/notifications";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/language-context";
import { defaultLanguage, translations, type TranslationKey } from "@/i18n/translations";

const TYPE_LABELS: Record<string, string> = {
  client_approval: "موافقة العميل",
  revision_request: "طلب تعديل",
  file_visible: "ملف جديد",
  subscription_limit: "حد الاشتراك",
  quotation_generated: "تم إنشاء عرض سعر",
  project_status_change: "تحديث حالة المشروع",
  stage_waiting_client: "موافقة مطلوبة",
};

export default function NotificationsPage() {
  const { direction, formatDate, t } = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    fetchNotifications(50)
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch((err) => toast({ title: err instanceof Error ? err.message : t("notifications.loadError"), variant: "destructive" }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.updateError"), variant: "destructive" });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast({ title: t("notifications.markAllRead") });
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.updateError"), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      load();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("notifications.deleteError"), variant: "destructive" });
    }
  };

  const translateDynamic = (key: string) =>
    key in translations[defaultLanguage] ? t(key as TranslationKey) : key;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5" dir={direction}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} ${t("notifications.unreadCount")}` : t("notifications.allRead")}
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="w-4 h-4" />
            {t("notifications.markAllRead")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("notifications.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className={notification.isRead ? "border-border/60" : "border-primary/40 bg-primary/5"}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold">{renderNotificationText(notification, "title", translateDynamic)}</h2>
                        <Badge variant="outline" className="font-normal">
                          {TYPE_LABELS[notification.notificationType] ?? notification.notificationType}
                        </Badge>
                        {!notification.isRead && <Badge className="font-normal">{t("common.new")}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{renderNotificationText(notification, "message", translateDynamic)}</p>
                      <p className="text-xs text-muted-foreground mt-2" dir="ltr">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!notification.isRead && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkRead(notification.id)}>
                          {t("notifications.markRead")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(notification.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
