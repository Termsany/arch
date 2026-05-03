import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { clientLogin } from "@/lib/client-api";

interface ClientUser {
  id: number;
  name: string;
  email: string;
  role: string;
  clientId: number | null;
  officeId: number | null;
}

interface ClientAuthContextType {
  clientUser: ClientUser | null;
  clientToken: string | null;
  loginAsClient: (email: string, password: string) => Promise<void>;
  logoutClient: () => void;
  isLoading: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

function decodeJwt(token: string): ClientUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    return payload as ClientUser;
  } catch {
    return null;
  }
}

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [clientToken, setClientToken] = useState<string | null>(localStorage.getItem("clientToken"));
  const [clientUser, setClientUser] = useState<ClientUser | null>(() => {
    const t = localStorage.getItem("clientToken");
    return t ? decodeJwt(t) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (clientToken) {
      const user = decodeJwt(clientToken);
      if (user) {
        setClientUser(user);
      } else {
        localStorage.removeItem("clientToken");
        setClientToken(null);
        setClientUser(null);
      }
    } else {
      setClientUser(null);
    }
  }, [clientToken]);

  const loginAsClient = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await clientLogin(email, password);
      if (data.user.role !== "client") {
        throw new Error("هذا الحساب ليس حساب عميل. يرجى الدخول من صفحة المشرف");
      }
      localStorage.setItem("clientToken", data.token);
      setClientToken(data.token);
      toast({ title: "مرحباً " + data.user.name });
      setLocation("/client/projects");
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطأ في تسجيل الدخول", variant: "destructive" });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutClient = () => {
    localStorage.removeItem("clientToken");
    setClientToken(null);
    setClientUser(null);
    setLocation("/client/login");
  };

  return (
    <ClientAuthContext.Provider value={{ clientUser, clientToken, loginAsClient, logoutClient, isLoading }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (!context) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return context;
}
