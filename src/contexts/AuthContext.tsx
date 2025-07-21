
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AuthContextType } from '@/types/auth';
import { createLogger } from '@/utils/logger';
import { authErrorHandler } from '@/services/authErrorHandler';
import { useNavigate } from 'react-router-dom';

const logger = createLogger('AuthContext');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initializingRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      logger.debug('Fetching profile for user', userId);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching profile', error);
        
        // Verifica se é erro de autenticação
        await authErrorHandler.handleAuthError(error, 'fetchProfile');
        return null;
      }

      if (profileData) {
        logger.debug('Profile found:', profileData.name);
        return profileData as Profile;
      } else {
        logger.debug('No profile found for user');
        return null;
      }
    } catch (err) {
      logger.error('Exception fetching profile', err);
      await authErrorHandler.handleAuthError(err, 'fetchProfile');
      return null;
    }
  };

  const handleAuthUser = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Force loading to false after timeout to prevent infinite loading
    const handleTimeout = setTimeout(() => {
      logger.warn('HandleAuthUser timeout - forcing loading to false');
      setLoading(false);
    }, 5000); // Reduced to 5 seconds

    try {
      logger.debug('Handling auth user', currentUser.email);
      
      // Tentar buscar perfil existente primeiro com timeout menor
      const profileData = await Promise.race([
        fetchProfile(currentUser.id),
        new Promise<Profile | null>((resolve) => 
          setTimeout(() => resolve(null), 3000) // 3 second timeout for profile fetch
        )
      ]);
      
      if (profileData) {
        setProfile(profileData);
      } else {
        logger.debug('Profile not found or timeout, will continue without profile');
        setProfile(null);
      }
    } catch (err) {
      logger.error('Error handling auth user', err);
      await authErrorHandler.handleAuthError(err, 'handleAuthUser');
      setProfile(null);
    } finally {
      clearTimeout(handleTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Evitar múltiplas inicializações
    if (initializingRef.current) {
      return;
    }
    
    initializingRef.current = true;

    // Configura o callback de redirecionamento para o handler de erros
    authErrorHandler.setRedirectCallback(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    });

    // Inicia o monitoramento de erros de autenticação
    authErrorHandler.startMonitoring();

    const initializeAuth = async () => {
      // Force loading to false after timeout to prevent infinite loading
      const initTimeout = setTimeout(() => {
        if (mounted) {
          logger.warn('Init timeout - forcing loading to false');
          setLoading(false);
          setInitialized(true);
        }
      }, 8000); // 8 second timeout
      
      try {
        logger.debug('Initializing auth');
        
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error getting session', error);
          await authErrorHandler.handleAuthError(error, 'getSession');
          // Não retornar aqui, continuar o processo
        }

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setInitialized(true);
          
          if (currentSession?.user) {
            try {
              await handleAuthUser(currentSession.user);
            } catch (userError) {
              logger.error('Error handling auth user during initialization', userError);
              await authErrorHandler.handleAuthError(userError, 'initializeAuth');
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        logger.error('Initialization error', err);
        await authErrorHandler.handleAuthError(err, 'initializeAuth');
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        clearTimeout(initTimeout);
        initializingRef.current = false;
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      logger.info(`[AUTH] onAuthStateChange event: ${event}`, { hasSession: !!newSession });
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      try {
        if (newSession?.user) {
          await handleAuthUser(newSession.user);
        } else {
          // Garante que o perfil seja limpo se não houver sessão
          setProfile(null);
        }
      } catch (error) {
        logger.error(`[AUTH] Error handling user on ${event} event`, error);
        await authErrorHandler.handleAuthError(error, `onAuthStateChange_${event}`);
        setProfile(null);
      } finally {
        // ESSENCIAL: Garante que o loading seja finalizado em todos os casos
        setLoading(false);
      }
    });

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove dependência problemática

  const signIn = async (email: string, password: string) => {
    try {
      logger.debug('Attempting sign in for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        logger.error('Sign in error from Supabase:', error);
        
        // IMPORTANTE: Definir loading como false em caso de erro
        setLoading(false);
        
        // Trata especificamente erros de credenciais inválidas
        if (error.message === 'Invalid login credentials') {
          // Este é um erro esperado, não precisa redirecionar
          return { error };
        }
        
        // Para outros erros de autenticação, pode ser necessário redirecionar
        await authErrorHandler.handleAuthError(error, 'signIn');
        return { error };
      }
      
      logger.debug('Sign in successful:', data.user?.email);
      // Para sucesso, deixar o onAuthStateChange cuidar do loading
      return { error: null };
    } catch (err: any) {
      logger.error('Sign in exception:', err);
      
      // IMPORTANTE: Definir loading como false em caso de exceção
      setLoading(false);
      
      await authErrorHandler.handleAuthError(err, 'signIn');
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      if (error) {
        await authErrorHandler.handleAuthError(error, 'signUp');
      }

      return { error };
    } catch (err: any) {
      logger.error('Sign up error', err);
      await authErrorHandler.handleAuthError(err, 'signUp');
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setInitialized(false);
        initializingRef.current = false;
      } else {
        await authErrorHandler.handleAuthError(error, 'signOut');
      }
      return { error };
    } catch (err: any) {
      logger.error('Sign out error', err);
      await authErrorHandler.handleAuthError(err, 'signOut');
      return { error: err };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
