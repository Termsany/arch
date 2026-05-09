import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n/language-context";
import { isLanguageCode } from "@/i18n/translations";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, languages, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-muted-foreground" />
      <Select
        value={language}
        onValueChange={(value) => {
          if (isLanguageCode(value)) setLanguage(value);
        }}
      >
        <SelectTrigger className={compact ? "w-[112px] h-9" : "w-[130px] h-9"}>
          <SelectValue placeholder={t("language.label")} />
        </SelectTrigger>
        <SelectContent>
          {languages.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {compact ? item.shortLabel : item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
