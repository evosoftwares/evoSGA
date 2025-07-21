import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';

// Mock dos componentes UI
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>
}));

// Mock dos ícones
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-triangle">⚠️</span>,
  RefreshCw: () => <span data-testid="refresh">🔄</span>,
  Home: () => <span data-testid="home">🏠</span>
}));

// Mock do authErrorHandler
vi.mock('@/services/authErrorHandler', () => ({
  authErrorHandler: {
    isAuthError: vi.fn(() => false),
    handleAuthError: vi.fn()
  }
}));

// Componente que gera erro para testar
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Erro de teste');
  }
  return <div>Componente funcionando</div>;
};

// Wrapper com Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suprimir erros do console durante os testes
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('deve renderizar children quando não há erro', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Componente funcionando')).toBeInTheDocument();
  });

  it('deve capturar e exibir erro quando child component falha', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Algo deu errado/i)).toBeInTheDocument();
  });

  it('deve exibir botões de ação quando há erro', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar ao início/i })).toBeInTheDocument();
  });

  it('deve recarregar a página quando botão "Recarregar" é clicado', () => {
    // Mock do window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /recarregar página/i });
    reloadButton.click();

    expect(mockReload).toHaveBeenCalled();
  });

  it('deve navegar para home quando botão "Voltar ao Início" é clicado', () => {
    // Mock do window.location.href
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    });

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /voltar ao início/i });
    homeButton.click();

    expect(mockLocation.href).toBe('/');
  });

  it('deve exibir informações de debug em desenvolvimento', () => {
    // Simular ambiente de desenvolvimento
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verificar se o summary está visível
    expect(screen.getByText(/detalhes do erro/i)).toBeInTheDocument();

    // Restaurar ambiente
    process.env.NODE_ENV = originalEnv;
  });

  it('deve resetar estado quando children mudam', () => {
    const { rerender } = renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verificar que o erro está sendo exibido
    expect(screen.getByText(/Algo deu errado/i)).toBeInTheDocument();

    // Renderizar novamente com componente que não gera erro
    rerender(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </BrowserRouter>
    );

    // Verificar que o componente normal está sendo exibido
    expect(screen.getByText('Componente funcionando')).toBeInTheDocument();
  });
});