
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ContestProvider, useContest } from '@/hooks/useContest';
import { Login } from '@/components/Login';
import { Navigation } from '@/components/Navigation';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Gallery } from '@/components/Gallery';
import { Ranking } from '@/components/Ranking';
import { AdminPanel } from '@/components/AdminPanel';
import { AllPhotos } from '@/components/AllPhotos';
import { Results } from '@/components/Results';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

function ContestGuard({ children }: { children: React.ReactNode }) {
  const { isContestActive } = useContest();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If contest is finished and user is not admin, redirect to results
    if (!isContestActive() && !isAdmin() && location.pathname !== '/resultados') {
      navigate('/resultados', { replace: true });
    }
  }, [isContestActive, isAdmin, location.pathname, navigate]);

  return <>{children}</>;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p>Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ContestGuard>
      <Routes>
        <Route path="/" element={<Navigate to="/galeria" replace />} />
        <Route path="/subir" element={<PhotoUpload />} />
        <Route path="/galeria" element={<Gallery />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/todas-las-fotos" element={<AllPhotos />} />
        <Route path="/resultados" element={<Results />} />
        <Route path="*" element={<Navigate to="/galeria" replace />} />
      </Routes>
      <Navigation />
    </ContestGuard>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ContestProvider>
          <AppContent />
          <Toaster />
        </ContestProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
