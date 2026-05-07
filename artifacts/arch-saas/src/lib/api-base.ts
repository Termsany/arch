import { setBaseUrl } from "@workspace/api-client-react";

function getApiOrigin(): string | null {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return null;
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api")
    ? withoutTrailingSlash.slice(0, -4)
    : withoutTrailingSlash;
}

function rewriteRequest(input: RequestInfo | URL, apiOrigin: string): RequestInfo | URL {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  if (!url.startsWith("/api") && !url.startsWith("/uploads")) return input;
  const absoluteUrl = `${apiOrigin}${url}`;

  if (typeof input === "string") return absoluteUrl;
  if (input instanceof URL) return new URL(absoluteUrl);
  return new Request(absoluteUrl, input);
}

export function configureApiBaseUrl(): void {
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return;

  setBaseUrl(apiOrigin);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => nativeFetch(rewriteRequest(input, apiOrigin), init);
}
