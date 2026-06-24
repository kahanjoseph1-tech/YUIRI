import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import RoleGate from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen authError={authError} />;
  }

  if (user?.approval_status === "pending") {
    return <PendingApprovalScreen />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <RoleGate pageKey={mainPageKey}>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </RoleGate>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RoleGate pageKey={path}>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </RoleGate>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function PendingApprovalScreen() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Waiting for approval</h1>
          <p className="text-sm text-slate-500 mt-2">
            {user?.email || "This account"} needs admin approval before using Yuiri.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function LoginScreen({ authError }) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitEmail = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (submitError) {
      setError(submitError.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (submitError) {
      setError(submitError.message || "Google sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/yuiri-logo.jpg" alt="Yuiri Support" className="mx-auto mb-3 h-20 w-20 rounded-xl bg-white object-cover shadow-sm" />
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Yuiri</h1>
          <p className="text-sm text-slate-500 mt-1">Support CRM</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={submitGoogle}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          <form className="space-y-3" onSubmit={submitEmail}>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            {(error || authError?.message) && (
              <p className="text-xs text-red-600">{error || authError.message}</p>
            )}
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" disabled={loading}>
              {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-xs text-slate-500 hover:text-slate-900"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Use an existing account" : "Create a new account"}
          </button>
        </div>
      </div>
    </div>
  );
}


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
