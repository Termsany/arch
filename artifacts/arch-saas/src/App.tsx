import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ClientAuthProvider, useClientAuth } from "@/hooks/use-client-auth";
import { Loader2 } from "lucide-react";
import Home from "./pages/home";
import Login from "./pages/login";
import ActivateInvite from "./pages/activate-invite";
import Dashboard from "./pages/dashboard";
import Pricing from "./pages/pricing";
import Start from "./pages/start";
import Clients from "./pages/clients";
import Projects from "./pages/projects";
import ProjectDetails from "./pages/project-details";
import DocumentViewer from "./pages/document-viewer";
import NotificationsPage from "./pages/notifications";
import TasksPage from "./pages/tasks";
import InvoicesPage from "./pages/invoices";
import InvoiceDetailsPage from "./pages/invoice-details";
import InvoiceFormPage from "./pages/invoice-form";
import ReportsPage from "./pages/reports";
import WhatsAppSettingsPage from "./pages/whatsapp";
import AuditLogsPage from "./pages/audit-logs";
import Plans from "./pages/plans";
import Offices from "./pages/offices";
import BOQLibrary from "./pages/boq-library";
import Subscription from "./pages/subscription";
import NotFound from "@/pages/not-found";
import ClientLogin from "./pages/client-login";
import ClientPortalDashboard from "./pages/client-portal-dashboard";
import ClientProjectDetails from "./pages/client-project-details";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 30,
    },
  },
});

function NavigateTo({ path }: { path: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(path);
  }, [path, setLocation]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <NavigateTo path="/login" />;
  }

  return <Component />;
}

function ClientProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { clientUser } = useClientAuth();

  if (!clientUser) {
    return <NavigateTo path="/client/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/client/login" component={ClientLogin} />
      <Route path="/client/projects/:id">
        {() => <ClientProtectedRoute component={ClientProjectDetails} />}
      </Route>
      <Route path="/client/projects">
        {() => <ClientProtectedRoute component={ClientPortalDashboard} />}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/set-password" component={ActivateInvite} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/start" component={Start} />
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={TasksPage} />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={InvoicesPage} />}
      </Route>
      <Route path="/invoices/:id">
        {() => <ProtectedRoute component={InvoiceDetailsPage} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={ReportsPage} />}
      </Route>
      <Route path="/whatsapp">
        {() => <ProtectedRoute component={WhatsAppSettingsPage} />}
      </Route>
      <Route path="/audit-logs">
        {() => <ProtectedRoute component={AuditLogsPage} />}
      </Route>
      <Route path="/projects/:id/invoices/new">
        {() => <ProtectedRoute component={InvoiceFormPage} />}
      </Route>
      <Route path="/projects/:id">
        {() => <ProtectedRoute component={ProjectDetails} />}
      </Route>
      <Route path="/documents/:id">
        {() => <ProtectedRoute component={DocumentViewer} />}
      </Route>
      <Route path="/plans">
        {() => <ProtectedRoute component={Plans} />}
      </Route>
      <Route path="/offices">
        {() => <ProtectedRoute component={Offices} />}
      </Route>
      <Route path="/boq-library">
        {() => <ProtectedRoute component={BOQLibrary} />}
      </Route>
      <Route path="/subscription">
        {() => <ProtectedRoute component={Subscription} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={NotificationsPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClientAuthProvider>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </ClientAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
