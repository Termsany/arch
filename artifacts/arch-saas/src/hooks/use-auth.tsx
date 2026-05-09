import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getGetMeQueryKey, useLogin, useGetMe } from "@workspace/api-client-react";
import type { LoginBody, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/language-context";
import { isLanguageCode } from "@/i18n/translations";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginBody) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type LoginResponseShape = {
  token?: unknown;
  user?: unknown;
  data?: {
    token?: unknown;
    user?: unknown;
  };
};

type LocalizedUser = User & {
  preferredLanguage?: string | null;
  mustChangePassword?: boolean | null;
  office?: {
    defaultLanguage?: string | null;
    currency?: string | null;
    timezone?: string | null;
    region?: string | null;
  } | null;
};

function normalizeLoginResponse(data: unknown): { token: string | null; user: User | null } {
  const payload = data && typeof data === "object" ? data as LoginResponseShape : {};
  const nested = payload.data && typeof payload.data === "object" ? payload.data : null;
  const token = typeof payload.token === "string" ? payload.token : typeof nested?.token === "string" ? nested.token : null;
  const user = payload.user && typeof payload.user === "object"
    ? payload.user as User
    : nested?.user && typeof nested.user === "object"
      ? nested.user as User
      : null;
  return { token, user };
}

function getLoginErrorMessage(error: unknown, fallback: { network: string; invalid: string; failed: string }): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown; error?: unknown }).message ?? (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof TypeError) return fallback.network;
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.includes("401")) return fallback.invalid;
  return fallback.failed;
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useTranslation();
  const hydratedLanguageUserId = useRef<number | null>(null);

  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (isTokenExpired(token)) {
      localStorage.removeItem("token");
      setToken(null);
      setLocation("/login");
      toast({ title: t("auth.sessionExpired"), variant: "destructive" });
    }
  }, [token, setLocation]);

  useEffect(() => {
    const localizedUser = user as LocalizedUser | null | undefined;
    if (!localizedUser?.id || hydratedLanguageUserId.current === localizedUser.id) return;
    const preferredLanguage = localizedUser.preferredLanguage;
    if (!isLanguageCode(preferredLanguage)) return;
    hydratedLanguageUserId.current = localizedUser.id;
    if (preferredLanguage !== language) setLanguage(preferredLanguage);
  }, [user, language, setLanguage]);

  useEffect(() => {
    const localizedUser = user as LocalizedUser | null | undefined;
    if (!localizedUser?.mustChangePassword) return;
    if (location === "/change-password-required") return;
    setLocation("/change-password-required");
  }, [user, location, setLocation]);

  useEffect(() => {
    if (!token) return;
    if (!user) return;

    fetch("/api/me/preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ preferredLanguage: language }),
    }).catch(() => undefined);
  }, [language, token, user]);

  useEffect(() => {
    const status = typeof (userError as { status?: unknown } | null)?.status === "number"
      ? (userError as { status: number }).status
      : null;
    if (!token || (status !== 401 && status !== 403)) return;

    localStorage.removeItem("token");
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/login");
    toast({ title: t("auth.validAdminRequired"), variant: "destructive" });
  }, [token, userError, queryClient, setLocation]);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("token");
      setToken(null);
      queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/login");
      toast({ title: t("auth.sessionExpired"), variant: "destructive" });
    };

    window.addEventListener("api:unauthorized", onUnauthorized);
    return () => window.removeEventListener("api:unauthorized", onUnauthorized);
  }, [queryClient, setLocation]);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        const loginData = normalizeLoginResponse(data);
        if (!loginData.token || !loginData.user) {
          if (import.meta.env.DEV) {
            console.debug("Login response missing token or user", {
              hasToken: Boolean(loginData.token),
              hasUser: Boolean(loginData.user),
            });
          }
          toast({ title: t("auth.login.failed"), variant: "destructive" });
          return;
        }
        if (loginData.user.role === "client") {
          localStorage.removeItem("token");
          setToken(null);
          queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: t("auth.clientAccountHint"), variant: "destructive" });
          setLocation("/client/login");
          return;
        }
        localStorage.removeItem("clientToken");
        const preferredLanguage = (loginData.user as LocalizedUser).preferredLanguage;
        if (isLanguageCode(preferredLanguage)) setLanguage(preferredLanguage);
        localStorage.setItem("token", loginData.token);
        localStorage.setItem("user", JSON.stringify(loginData.user));
        setToken(loginData.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: t("auth.login.success") });
        setLocation((loginData.user as LocalizedUser).mustChangePassword ? "/change-password-required" : "/dashboard");
      },
      onError: (error) => {
        toast({
          title: getLoginErrorMessage(error, {
            network: t("auth.login.network"),
            invalid: t("auth.login.failed"),
            failed: t("auth.login.failed"),
          }),
          variant: "destructive",
        });
      },
    },
  });

  const login = async (data: LoginBody) => {
    const email = data.email.trim();
    if (!email || !data.password) {
      toast({ title: t("auth.login.required"), variant: "destructive" });
      return;
    }
    if (import.meta.env.DEV) {
      console.debug("Login submit started", { email, url: "/api/auth/login" });
    }
    await loginMutation.mutateAsync({ data: { ...data, email } });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setLocation("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        token,
        login,
        logout,
        isLoading: isUserLoading || loginMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
