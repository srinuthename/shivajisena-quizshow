// Toast notifications disabled — Toaster components removed from render tree
// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { QuizGameProvider } from "@/context/QuizGameContext";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import AnalyticsManager from "@/components/AnalyticsManager";
import GlobalNav from "@/components/GlobalNav";
import FloatingParticlesBackground from "@/components/FloatingParticlesBackground";
import { AuthProvider, RequireAuth, RequireYouTube } from "@/auth";
import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getAppMode } from "@/config/appMode";

// Home is eagerly loaded so the landing route paints immediately on first visit.
import Home from "./pages/Home";
import QuizMirror from "./pages/QuizMirror";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Spectator from "./pages/Spectator";
import ViewersLeaderboard from "./pages/ViewersLeaderboard";
import QuizManagement from "./pages/QuizManagement";
import Advanced from "./pages/Advanced";
import FinalTeamLeaderboard from "./pages/FinalTeamLeaderboard";
import FinalViewerLeaderboard from "./pages/FinalViewerLeaderboard";
import Prizing from "./pages/Prizing";
import PrizeAssignments from "./pages/PrizeAssignments";
import PrizeClaim from "./pages/PrizeClaim";
import AuthCallback from "./pages/AuthCallback";
import Loyalty from "./pages/Loyalty";
import Disclaimer from "./pages/Disclaimer";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";

const queryClient = new QueryClient();

const AppRuntime = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const QuizRuntime = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>
    <QuizGameProvider>{children}</QuizGameProvider>
  </AppProvider>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  const isOffline = getAppMode() === "offline";
  const runtimeElement = (node: React.ReactNode) => (
    <QuizRuntime>{node}</QuizRuntime>
  );
  const appProtectedElement = (node: React.ReactNode) => (
    <RequireAuth>
      <AppRuntime>{node}</AppRuntime>
    </RequireAuth>
  );
  const quizProtectedElement = (node: React.ReactNode) => (
    <RequireAuth>
      <QuizRuntime>
        <RequireYouTube>{node}</RequireYouTube>
      </QuizRuntime>
    </RequireAuth>
  );

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Home />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/legal/disclaimer" element={<Disclaimer />} />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<TermsAndConditions />} />
      <Route path="/admin" element={quizProtectedElement(<ErrorBoundary pageName="Admin"><Admin /></ErrorBoundary>)} />
      <Route path="/quiz-management" element={appProtectedElement(<ErrorBoundary pageName="QuizManagement"><QuizManagement /></ErrorBoundary>)} />
      <Route path="/advanced" element={isOffline ? <Navigate to="/admin" replace /> : appProtectedElement(<ErrorBoundary pageName="Advanced"><Advanced /></ErrorBoundary>)} />
      <Route path="/advanced-analytics" element={isOffline ? <Navigate to="/admin" replace /> : <Navigate to="/advanced?tab=analytics" replace />} />
      <Route path="/prizing" element={isOffline ? <Navigate to="/admin" replace /> : appProtectedElement(<ErrorBoundary pageName="Prizing"><Prizing /></ErrorBoundary>)} />
      <Route path="/prizes/policy" element={isOffline ? <Navigate to="/admin" replace /> : <Navigate to="/admin?workspace=data" replace />} />
      <Route path="/prizes/assignments" element={isOffline ? <Navigate to="/admin" replace /> : appProtectedElement(<ErrorBoundary pageName="PrizeAssignments"><PrizeAssignments /></ErrorBoundary>)} />
      <Route path="/prizes/claim" element={isOffline ? <Navigate to="/admin" replace /> : appProtectedElement(<ErrorBoundary pageName="PrizeClaim"><PrizeClaim /></ErrorBoundary>)} />
        <Route path="/quiz" element={quizProtectedElement(<Index />)} />
        <Route path="/obs-boards" element={<Navigate to="/admin?workspace=boards" replace />} />
        <Route path="/spectator" element={quizProtectedElement(<Spectator />)} />
        <Route path="/history" element={isOffline ? <Navigate to="/admin" replace /> : <Navigate to="/advanced" replace />} />
        <Route path="/viewers" element={quizProtectedElement(<ViewersLeaderboard />)} />
        <Route path="/quiz/end/teams" element={quizProtectedElement(<ErrorBoundary pageName="FinalTeamLeaderboard"><FinalTeamLeaderboard /></ErrorBoundary>)} />
        <Route path="/quiz/end/viewers" element={isOffline ? <Navigate to="/quiz/end/teams" replace /> : quizProtectedElement(<ErrorBoundary pageName="FinalViewerLeaderboard"><FinalViewerLeaderboard /></ErrorBoundary>)} />
        <Route path="/quiz/mirror" element={quizProtectedElement(<QuizMirror />)} />
        <Route path="/loyalty" element={isOffline ? <Navigate to="/" replace /> : appProtectedElement(<ErrorBoundary pageName="Loyalty"><Loyalty /></ErrorBoundary>)} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toast notifications disabled */}
      {/* <Toaster /> */}
      {/* <Sonner /> */}
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnalyticsManager />
          <FloatingParticlesBackground />
          <GlobalNav />
          <AnimatedRoutes />
          <CookieConsentBanner />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
