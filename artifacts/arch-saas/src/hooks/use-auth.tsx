import { createContext, useContext, useEffect, useState } from "react";
import { getGetMeQueryKey, useLogin, useGetMe } from "@workspace/api-client-react";
import type { LoginBody, User } from "@workspace/api-client-react";
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

  const { data: user, isLoading: isUserLoading } = useGetMe({
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
    const onUnauthorized = () => {
      localStorage.removeItem("token");
      setToken(null);
      setLocation("/login");
      toast({ title: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
    };

    window.addEventListener("api:unauthorized", onUnauthorized);
    return () => window.removeEventListener("api:unauthorized", onUnauthorized);
  }, [setLocation]);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "بيانات الدخول غير صحيحة", variant: "destructive" });
      },
    },
  });

  const login = async (data: LoginBody) => {
    await loginMutation.mutateAsync({ data });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setLocation("/login");
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
