import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { authErrorHandler } from '@/services/authErrorHandler';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  prevChildren: ReactNode;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    prevChildren: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Reset error state if children have changed
    if (props.children !== state.prevChildren && state.hasError) {
      return {
        hasError: false,
        error: null,
        errorInfo: null,
        prevChildren: props.children
      };
    }
    
    // Update prevChildren to track changes
    if (props.children !== state.prevChildren) {
      return {
        prevChildren: props.children
      };
    }
    
    return null;
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Verifica se é erro de autenticação
    if (authErrorHandler.isAuthError(error)) {
      authErrorHandler.handleAuthError(error, 'ErrorBoundary');
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoToAuth = () => {
    window.location.href = '/auth';
  };

  public render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error && authErrorHandler.isAuthError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                {isAuthError ? 'Erro de Autenticação' : 'Algo deu errado'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                {isAuthError 
                  ? 'Sua sessão expirou ou há um problema com sua autenticação. Por favor, faça login novamente.'
                  : 'Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.'
                }
              </p>
              
              <div className="space-y-2">
                {isAuthError ? (
                  <Button 
                    onClick={this.handleGoToAuth}
                    className="w-full"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Ir para Login
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={this.handleReload}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recarregar Página
                    </Button>
                    <Button 
                      onClick={this.handleGoHome}
                      variant="outline"
                      className="w-full"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Voltar ao Início
                    </Button>
                  </>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;