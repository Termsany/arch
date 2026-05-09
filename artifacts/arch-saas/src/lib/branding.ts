export type OfficeBranding = {
  logoUrl: string | null;
  darkLogoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string;
  officeName: string | null;
};

export const DEFAULT_BRAND_COLOR = "#dc2626";

type OfficeBrandingSource = Partial<OfficeBranding> & {
  officeName?: string | null;
  name?: string | null;
};

function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidBrandColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(value.trim());
}

export function getOfficeBranding(office?: OfficeBrandingSource | null): OfficeBranding {
  return {
    logoUrl: isSafeUrl(office?.logoUrl) ? office.logoUrl.trim() : null,
    darkLogoUrl: isSafeUrl(office?.darkLogoUrl) ? office.darkLogoUrl.trim() : null,
    faviconUrl: isSafeUrl(office?.faviconUrl) ? office.faviconUrl.trim() : null,
    brandColor: isValidBrandColor(office?.brandColor) ? office.brandColor.trim() : DEFAULT_BRAND_COLOR,
    officeName: office?.officeName || office?.name || null,
  };
}

export function getStoredOfficeBranding(): OfficeBranding {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return getOfficeBranding(null);
    const user = JSON.parse(stored) as { office?: OfficeBrandingSource | null };
    return getOfficeBranding(user.office);
  } catch {
    return getOfficeBranding(null);
  }
}

export function updateFavicon(url?: string | null) {
  const href = isSafeUrl(url) ? url.trim() : "/favicon.ico";
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = href;
}
