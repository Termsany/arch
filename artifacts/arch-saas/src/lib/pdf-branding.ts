import { getStoredOfficeBranding } from "./branding";

export function getPdfBranding() {
  const branding = getStoredOfficeBranding();

  return {
    logo: branding.logoUrl,
    brandColor: branding.brandColor,
    officeName: branding.officeName || "ArchSaaS",
  };
}
