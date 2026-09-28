import { Route, Switch, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import OnboardingTour from "./components/Onboarding/OnboardingTour";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Approvals from "./pages/Approvals";
import Team from "./pages/Team";
import Admin from "./pages/Admin";
import TimesheetDetail from "./pages/TimesheetDetail";
import Finance from "./pages/Finance";
import Submissions from "./pages/Submissions";
import SubmissionDetail from "./pages/SubmissionDetail";
import MemberDrilldown from "./pages/MemberDrilldown";
import DailyLogging from "./pages/DailyLogging";
import Reports from "./pages/Reports";
import Utilisation from "./pages/Utilisation";
import RateCards from "./pages/RateCards";
import Budgets from "./pages/Budgets";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, allowedRoles, ...rest }: any) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-text_primary font-sans">
      <Switch>
        <Route path="/login">
          {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
        </Route>

        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/daily-logging">
          <ProtectedRoute component={DailyLogging} />
        </Route>
        <Route path="/timesheets">
          <Redirect to="/daily-logging" />
        </Route>
        <Route path="/timesheets/:id">
          {(params: any) => <ProtectedRoute component={TimesheetDetail} params={params} />}
        </Route>
        <Route path="/submissions">
          <ProtectedRoute component={Submissions} />
        </Route>
        <Route path="/submissions/:id">
          {(params: any) => <ProtectedRoute component={SubmissionDetail} params={params} />}
        </Route>
        <Route path="/approvals">
          <ProtectedRoute component={Approvals} allowedRoles={['line_manager', 'hod', 'admin']} />
        </Route>
        <Route path="/team">
          <ProtectedRoute component={Team} allowedRoles={['line_manager', 'hod', 'admin']} />
        </Route>
        <Route path="/team/:userId">
          {(params: any) => <ProtectedRoute component={MemberDrilldown} allowedRoles={['line_manager', 'hod', 'admin']} params={params} />}
        </Route>
        <Route path="/finance">
          <ProtectedRoute component={Finance} allowedRoles={['finance', 'admin', 'hod']} />
        </Route>
        <Route path="/reports">
          <ProtectedRoute component={Reports} allowedRoles={['finance', 'admin', 'line_manager', 'hod']} />
        </Route>
        <Route path="/utilisation">
          <ProtectedRoute component={Utilisation} allowedRoles={['finance', 'admin', 'line_manager', 'hod']} />
        </Route>
        <Route path="/rate-cards">
          <ProtectedRoute component={RateCards} allowedRoles={['admin']} />
        </Route>
        <Route path="/budgets">
          <ProtectedRoute component={Budgets} allowedRoles={['finance', 'admin', 'hod']} />
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={Admin} allowedRoles={['admin']} />
        </Route>

        <Route>
          <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <h1 className="text-4xl font-bold text-text_primary mb-4">404</h1>
            <p className="text-text_secondary mb-8">Page Not Found</p>
            <a href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary_dark transition-colors">
              Return Home
            </a>
          </div>
        </Route>
      </Switch>
      {/* Role-based onboarding tour: mounts inside the authed shell only */}
      {isAuthenticated && <OnboardingTour />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
