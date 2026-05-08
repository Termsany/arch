import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { configureApiBaseUrl } from "@/lib/api-base";
import { LanguageProvider } from "@/i18n/language-context";
import App from "./App";
import "./index.css";

configureApiBaseUrl();
setAuthTokenGetter(() => localStorage.getItem("token"));

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
