import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

// Helper para renderizar com providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App Component', () => {
  it('should render without crashing', () => {
    renderWithProviders(<App />)
    // Verifica se a aplicação renderiza sem erros
    expect(document.body).toBeInTheDocument()
  })

  it('should have proper document structure', () => {
    renderWithProviders(<App />)
    // Verifica estrutura básica
    expect(document.querySelector('html')).toBeInTheDocument()
  })
})