
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorHandler } from '@/services/authErrorHandler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProtectedRoute');

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [forceLoadingOff, setForceLoadingOff] = useState(false);

  useEffect(() => {
    // Configura o callback de redirecionamento para usar o navigate do React Router
    authErrorHandler.setRedirectCallback(() => {
      logger.info('Redirecting to auth page due to authentication error');
      navigate('/auth', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!loading && !user) {
      logger.info('No authenticated user found, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Force loading off after timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        logger.warn('ProtectedRoute: Loading timeout - forcing off');
        setForceLoadingOff(true);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // If loading was forced off and no user, redirect to auth
  useEffect(() => {
    if (forceLoadingOff && !user) {
      logger.warn('Loading forced off with no user, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [forceLoadingOff, user, navigate]);

  if (loading && !forceLoadingOff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
