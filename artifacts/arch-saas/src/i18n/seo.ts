import { defaultLanguage, type LanguageCode } from "./translations";

const metadata = {
  ar: {
    home: { title: "ArchSaaS", description: "منصة إدارة مكاتب التصميم المعماري والداخلي" },
    pricing: { title: "الأسعار | ArchSaaS", description: "خطط اشتراك مكاتب التصميم" },
    login: { title: "تسجيل الدخول | ArchSaaS", description: "دخول مكاتب التصميم إلى ArchSaaS" },
    start: { title: "ابدأ استخدام النظام | ArchSaaS", description: "إنشاء مكتب جديد وتجربة ArchSaaS" },
  },
  en: {
    home: { title: "ArchSaaS", description: "Architecture and interior design office management platform" },
    pricing: { title: "Pricing | ArchSaaS", description: "Subscription plans for design offices" },
    login: { title: "Login | ArchSaaS", description: "Office login for ArchSaaS" },
    start: { title: "Start | ArchSaaS", description: "Create a new office and try ArchSaaS" },
  },
  fr: {
    home: { title: "ArchSaaS", description: "Plateforme de gestion pour bureaux d’architecture et design" },
    pricing: { title: "Tarifs | ArchSaaS", description: "Plans d’abonnement pour bureaux de design" },
    login: { title: "Connexion | ArchSaaS", description: "Connexion bureau à ArchSaaS" },
    start: { title: "Démarrer | ArchSaaS", description: "Créer un bureau et essayer ArchSaaS" },
  },
} as const;

export type SeoRouteKey = keyof typeof metadata[typeof defaultLanguage];

export function setLocalizedMeta(routeKey: SeoRouteKey, language: LanguageCode): void {
  const routeMeta = metadata[language]?.[routeKey] ?? metadata[defaultLanguage][routeKey];
  document.title = routeMeta.title;

  let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
  }
  description.content = routeMeta.description;
}
