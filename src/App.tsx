import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OrgStatusProvider, useOrgStatus } from "./contexts/OrgStatusContext";
import { OrgBlockedOverlay } from "./components/OrgBlockedOverlay";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Deploy from "./pages/Deploy";
import AddValidation from "./pages/AddValidation";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { orgStatus, isBlocked } = useOrgStatus();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/deploy" element={<ProtectedRoute><Deploy /></ProtectedRoute>} />
          <Route path="/add-validation" element={<ProtectedRoute><AddValidation /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      {/* Organization Blocked Overlay */}
      {isBlocked && orgStatus && (
        <OrgBlockedOverlay 
          status={orgStatus.status as 'paused' | 'expired'} 
          message={orgStatus.message} 
        />
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrgStatusProvider>
          <AppContent />
        </OrgStatusProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
