import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Pricing from "./pages/pricing";
import Clients from "./pages/clients";
import Projects from "./pages/projects";
import ProjectDetails from "./pages/project-details";
import Plans from "./pages/plans";
import Offices from "./pages/offices";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 30,
    },
  },
});

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
    window.location.href = import.meta.env.BASE_URL + "login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} />}
      </Route>
      <Route path="/projects/:id">
        {(params) => <ProtectedRoute component={() => <ProjectDetails id={parseInt(params.id)} />} />}
      </Route>
      <Route path="/plans">
        {() => <ProtectedRoute component={Plans} />}
      </Route>
      <Route path="/offices">
        {() => <ProtectedRoute component={Offices} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
