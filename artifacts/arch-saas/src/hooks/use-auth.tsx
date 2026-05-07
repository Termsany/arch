import { createContext, useContext, useEffect, useState } from "react";
import { getGetMeQueryKey, useLogin, useGetMe } from "@workspace/api-client-react";
import type { LoginBody, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

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

function getLoginErrorMessage(error: unknown): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown; error?: unknown }).message ?? (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof TypeError) return "تعذر الاتصال بالخادم";
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.includes("401")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  return "حدث خطأ أثناء تسجيل الدخول";
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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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
      toast({ title: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
    }
  }, [token, setLocation]);

  useEffect(() => {
    const status = typeof (userError as { status?: unknown } | null)?.status === "number"
      ? (userError as { status: number }).status
      : null;
    if (!token || (status !== 401 && status !== 403)) return;

    localStorage.removeItem("token");
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/login");
    toast({ title: "يرجى تسجيل الدخول بحساب إدارة صالح", variant: "destructive" });
  }, [token, userError, queryClient, setLocation]);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("token");
      setToken(null);
      queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/login");
      toast({ title: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
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
          toast({ title: "حدث خطأ أثناء تسجيل الدخول", variant: "destructive" });
          return;
        }
        if (loginData.user.role === "client") {
          localStorage.removeItem("token");
          setToken(null);
          queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "هذا حساب عميل. استخدم صفحة بوابة العميل", variant: "destructive" });
          setLocation("/client/login");
          return;
        }
        localStorage.removeItem("clientToken");
        localStorage.setItem("token", loginData.token);
        localStorage.setItem("user", JSON.stringify(loginData.user));
        setToken(loginData.token);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({ title: getLoginErrorMessage(error), variant: "destructive" });
      },
    },
  });

  const login = async (data: LoginBody) => {
    const email = data.email.trim();
    if (!email || !data.password) {
      toast({ title: "البريد الإلكتروني وكلمة المرور مطلوبان", variant: "destructive" });
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
