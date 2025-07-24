# 📋 Guia de Implementação - Módulo Kanban Genérico

Este documento fornece um guia passo a passo para implementar o módulo Kanban genérico em diferentes contextos do sistema evoSGA.

## 📝 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Implementação Básica](#implementação-básica)
4. [Implementação Avançada](#implementação-avançada)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Troubleshooting](#troubleshooting)
7. [Boas Práticas](#boas-práticas)

## 🎯 Visão Geral

O módulo Kanban genérico permite criar boards Kanban reutilizáveis para diferentes contextos:
- **Tarefas** (já implementado)
- **Vendas/Oportunidades**
- **CRM/Leads**
- **Recrutamento**
- **Projetos**
- **Suporte/Tickets**

### Arquitetura

```
┌─────────────────────────────────────┐
│           GenericKanban             │
├─────────────────────────────────────┤
│ • Props configuráveis               │
│ • Hooks de dados flexíveis          │
│ • Componentes substituíveis         │
│ • Celebrações customizáveis         │
│ • Real-time opcional                │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│        Hook de Dados                │
├─────────────────────────────────────┤
│ • Implementa KanbanDataHook         │
│ • Busca dados específicos           │
│ • Mutations CRUD                    │
│ • Real-time subscriptions           │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│       Backend/Database              │
├─────────────────────────────────────┤
│ • Tabelas específicas               │
│ • RLS policies                      │
│ • Functions SQL                     │
└─────────────────────────────────────┘
```

## ✅ Pré-requisitos

### Dependências
- React 18+
- TypeScript
- @tanstack/react-query
- @hello-pangea/dnd
- Supabase (para dados)
- Tailwind CSS

### Estrutura de Dados

Suas tabelas devem ter pelo menos estas colunas essenciais:

```sql
-- Exemplo para vendas
CREATE TABLE sales_opportunities (
  id uuid PRIMARY KEY,
  title varchar NOT NULL,
  description text,
  column_id uuid REFERENCES sales_columns(id),
  position integer DEFAULT 0,
  assignee uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE sales_columns (
  id uuid PRIMARY KEY,
  title varchar NOT NULL,
  position integer NOT NULL,
  color varchar DEFAULT '#6B7280'
);
```

## 🚀 Implementação Básica

### Passo 1: Criar Hook de Dados

Crie um hook que implemente a interface `KanbanDataHook`:

```tsx
// src/hooks/sales/useSalesKanbanData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanDataHook } from '@/components/kanban/types';

export const useSalesKanbanData = (projectId?: string | null): KanbanDataHook => {
  const queryClient = useQueryClient();

  // 1. Buscar dados
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-kanban', projectId],
    queryFn: async () => {
      const [columnsRes, opportunitiesRes, profilesRes] = await Promise.all([
        supabase.from('sales_columns').select('*').order('position'),
        supabase.from('sales_opportunities').select('*').order('position'),
        supabase.from('profiles').select('*')
      ]);

      return {
        columns: columnsRes.data || [],
        opportunities: opportunitiesRes.data || [],
        profiles: profilesRes.data || []
      };
    }
  });

  // 2. Mutation para mover itens
  const moveMutation = useMutation({
    mutationFn: async ({ taskId, sourceColumnId, destColumnId, destIndex }) => {
      const { error } = await supabase
        .from('sales_opportunities')
        .update({ 
          column_id: destColumnId, 
          position: destIndex 
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-kanban']);
    }
  });

  // 3. Mutation para criar
  const createMutation = useMutation({
    mutationFn: async ({ taskData, columnId }) => {
      const { error } = await supabase
        .from('sales_opportunities')
        .insert({
          ...taskData,
          column_id: columnId,
          position: 0
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-kanban']);
    }
  });

  // 4. Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      const { error } = await supabase
        .from('sales_opportunities')
        .update(updates)
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-kanban']);
    }
  });

  // 5. Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async ({ taskId }) => {
      const { error } = await supabase
        .from('sales_opportunities')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sales-kanban']);
    }
  });

  // 6. Retornar interface padronizada
  return {
    columns: data?.columns || [],
    tasks: data?.opportunities || [], // Mapear para 'tasks'
    profiles: data?.profiles || [],
    tags: [], // Se não usar tags
    taskTags: [], // Se não usar tags
    loading: isLoading,
    error: error?.message || null,
    moveTask: (taskId, sourceColumnId, destColumnId, destIndex) => {
      moveMutation.mutate({ taskId, sourceColumnId, destColumnId, destIndex });
    },
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    refreshData: () => queryClient.invalidateQueries(['sales-kanban'])
  };
};
```

### Passo 2: Criar Componente da Página

```tsx
// src/pages/SalesKanbanPage.tsx
import React from 'react';
import { GenericKanban } from '@/components/kanban';
import { useSalesKanbanData } from '@/hooks/sales/useSalesKanbanData';
import Header from '@/components/layout/Header';

const SalesKanbanPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main className="w-full p-3 sm:p-4 lg:p-6">
        <GenericKanban
          useDataHook={useSalesKanbanData}
          selectedProjectId={null}
          celebrationConfig={{
            enabled: true,
            messages: [
              '🎉 Venda fechada!',
              '💰 Negócio conquistado!',
              '🚀 Meta batida!'
            ],
            showPoints: false,
            showAssignee: true,
            duration: 4000
          }}
          showTeamMembers={true}
          teamMembersTitle="Equipe de Vendas"
          showProjectsSummary={false}
          enableDragAndDrop={true}
          enableTaskCreation={true}
        />
      </main>
    </div>
  );
};

export default SalesKanbanPage;
```

### Passo 3: Adicionar Rota

```tsx
// src/App.tsx ou router configuration
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SalesKanbanPage from '@/pages/SalesKanbanPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* ... outras rotas */}
        <Route path="/sales-kanban" element={<SalesKanbanPage />} />
        {/* ... */}
      </Routes>
    </Router>
  );
}
```

### Passo 4: Configurar Banco de Dados

```sql
-- 1. Criar tabelas necessárias
CREATE TABLE sales_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  position integer NOT NULL,
  color varchar DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  description text,
  column_id uuid REFERENCES sales_columns(id),
  position integer DEFAULT 0,
  assignee uuid REFERENCES profiles(id),
  deal_value decimal,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Inserir colunas padrão
INSERT INTO sales_columns (title, position, color) VALUES
('Leads', 0, '#ef4444'),
('Qualificados', 1, '#f97316'),
('Proposta', 2, '#eab308'),
('Negociação', 3, '#3b82f6'),
('Fechado', 4, '#22c55e');

-- 3. Configurar RLS
ALTER TABLE sales_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;

-- Policies básicas (ajuste conforme necessário)
CREATE POLICY "Users can view sales columns" ON sales_columns 
  FOR SELECT USING (true);

CREATE POLICY "Users can view sales opportunities" ON sales_opportunities 
  FOR SELECT USING (true);

CREATE POLICY "Users can update sales opportunities" ON sales_opportunities 
  FOR UPDATE USING (true);
```

## 🎨 Implementação Avançada

### Real-time Updates

```tsx
// src/hooks/sales/useSalesRealTime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSalesRealTime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sales_opportunities' 
        },
        () => {
          queryClient.invalidateQueries(['sales-kanban']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

// Use no hook de dados
export const useSalesKanbanData = (projectId?: string | null) => {
  useSalesRealTime(); // Adicionar esta linha
  
  // ... resto do código
};
```

### Componentes Customizados

```tsx
// src/components/sales/SalesOpportunityCard.tsx
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface SalesOpportunityCardProps {
  task: any; // Sua interface de oportunidade
  index: number;
  onClick: () => void;
  // ... outras props
}

const SalesOpportunityCard: React.FC<SalesOpportunityCardProps> = ({
  task,
  index,
  onClick
}) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className="bg-white rounded-lg border p-4 mb-2 cursor-pointer hover:shadow-md transition-shadow"
        >
          <h3 className="font-medium text-gray-900 mb-2">{task.title}</h3>
          
          {/* Valor do negócio */}
          {task.deal_value && (
            <div className="text-green-600 font-semibold mb-2">
              R$ {task.deal_value.toLocaleString()}
            </div>
          )}
          
          {/* Cliente */}
          {task.client_name && (
            <div className="text-sm text-gray-600 mb-2">
              👤 {task.client_name}
            </div>
          )}
          
          {/* Responsável */}
          {task.assignee_name && (
            <div className="text-xs text-gray-500">
              📝 {task.assignee_name}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// Usar no GenericKanban
<GenericKanban
  TaskCardComponent={SalesOpportunityCard}
  // ... outras props
/>
```

### Validações e Restrições

```tsx
// Restrições específicas para vendas
const getSalesColumnRestrictions = (column) => {
  const isClosedColumn = column.title.toLowerCase().includes('fechado');
  const isLeadColumn = column.title.toLowerCase().includes('leads');
  
  return {
    allowDragIn: true,
    allowDragOut: !isClosedColumn, // Não pode sair de fechado
    allowTaskCreation: isLeadColumn // Só pode criar em leads
  };
};

<GenericKanban
  getColumnRestrictions={getSalesColumnRestrictions}
  // ... outras props
/>
```

## 📋 Exemplos Práticos

### 1. Sistema de CRM

```tsx
// src/hooks/crm/useCRMKanbanData.ts
export const useCRMKanbanData = () => {
  // Implementação similar ao sales, mas para leads/prospects
  
  const { data } = useQuery({
    queryKey: ['crm-kanban'],
    queryFn: async () => {
      const [columnsRes, leadsRes] = await Promise.all([
        supabase.from('crm_columns').select('*'),
        supabase.from('crm_leads').select('*')
      ]);
      
      return {
        columns: columnsRes.data,
        leads: leadsRes.data
      };
    }
  });
  
  return {
    columns: data?.columns || [],
    tasks: data?.leads || [],
    // ... resto da implementação
  };
};

// src/pages/CRMPage.tsx
const CRMPage = () => (
  <GenericKanban
    useDataHook={useCRMKanbanData}
    celebrationConfig={{
      enabled: true,
      messages: ['🎯 Lead qualificado!', '📞 Contato estabelecido!']
    }}
    teamMembersTitle="Equipe de CRM"
    showProjectsSummary={false}
  />
);
```

### 2. Sistema de Recrutamento

```tsx
// src/hooks/recruitment/useRecruitmentKanbanData.ts
export const useRecruitmentKanbanData = () => {
  // Implementação para candidatos em processo seletivo
  
  return {
    columns: [
      { id: '1', title: 'Candidatos', position: 0 },
      { id: '2', title: 'Triagem', position: 1 },
      { id: '3', title: 'Entrevista', position: 2 },
      { id: '4', title: 'Teste Técnico', position: 3 },
      { id: '5', title: 'Contratado', position: 4 }
    ],
    tasks: candidates, // Lista de candidatos
    // ... resto
  };
};

// src/pages/RecruitmentPage.tsx
const RecruitmentPage = () => (
  <GenericKanban
    useDataHook={useRecruitmentKanbanData}
    celebrationConfig={{
      enabled: true,
      messages: ['🎉 Candidato contratado!', '👏 Novo talento!'],
      showAssignee: true
    }}
    teamMembersTitle="Recrutadores"
  />
);
```

### 3. Sistema de Suporte

```tsx
// src/hooks/support/useSupportKanbanData.ts
export const useSupportKanbanData = () => {
  // Implementação para tickets de suporte
  
  return {
    columns: [
      { id: '1', title: 'Aberto', position: 0, color: '#ef4444' },
      { id: '2', title: 'Em Análise', position: 1, color: '#f97316' },
      { id: '3', title: 'Em Desenvolvimento', position: 2, color: '#3b82f6' },
      { id: '4', title: 'Teste', position: 3, color: '#8b5cf6' },
      { id: '5', title: 'Resolvido', position: 4, color: '#22c55e' }
    ],
    tasks: tickets,
    // ... resto
  };
};

// src/pages/SupportPage.tsx
const SupportPage = () => (
  <GenericKanban
    useDataHook={useSupportKanbanData}
    celebrationConfig={{
      enabled: true,
      messages: ['✅ Ticket resolvido!', '🛠️ Problema solucionado!']
    }}
    teamMembersTitle="Equipe de Suporte"
    showProjectsSummary={false}
  />
);
```

## 🔧 Troubleshooting

### Problema: Dados não carregam

**Sintoma:** Kanban fica em loading infinito

**Soluções:**
1. Verifique se as queries estão corretas
2. Confirme RLS policies no Supabase
3. Verifique network tab para erros de API
4. Valide se `queryKey` está correta

```tsx
// Debug query
const { data, isLoading, error } = useQuery({
  queryKey: ['sales-kanban'],
  queryFn: async () => {
    console.log('Fetching sales data...'); // Debug
    const result = await fetchSalesData();
    console.log('Result:', result); // Debug
    return result;
  }
});

console.log({ data, isLoading, error }); // Debug
```

### Problema: Drag and drop não funciona

**Sintoma:** Items não movem entre colunas

**Soluções:**
1. Verifique se `enableDragAndDrop={true}`
2. Confirme se `moveTask` está implementado
3. Valide se as mutations estão funcionando
4. Verifique restrictions de coluna

```tsx
// Debug moveTask
const moveTask = (taskId, sourceColumnId, destColumnId, destIndex) => {
  console.log('Moving task:', { taskId, sourceColumnId, destColumnId, destIndex });
  moveMutation.mutate({ taskId, sourceColumnId, destColumnId, destIndex });
};
```

### Problema: Real-time não funciona

**Sintoma:** Mudanças não aparecem automaticamente

**Soluções:**
1. Verifique se canal está subscrito corretamente
2. Confirme se invalidateQueries está sendo chamado
3. Valide se RLS permite listening
4. Teste subscription separadamente

```tsx
// Debug real-time
useEffect(() => {
  const channel = supabase
    .channel('debug-sales')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_opportunities' }, 
      (payload) => {
        console.log('Real-time update:', payload); // Debug
        queryClient.invalidateQueries(['sales-kanban']);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status); // Debug
    });

  return () => supabase.removeChannel(channel);
}, []);
```

### Problema: Celebrações não aparecem

**Sintoma:** Confetes/mensagens não mostram

**Soluções:**
1. Verifique se `celebrationConfig.enabled={true}`
2. Confirme se está movendo para coluna de sucesso
3. Valide se window está disponível (SSR)
4. Teste diferentes mensagens

```tsx
// Debug celebrations
const celebrationConfig = {
  enabled: true,
  messages: ['🎉 Test celebration!'],
  getCustomMessage: (task) => {
    console.log('Celebrating task:', task); // Debug
    return '🎉 Debug celebration!';
  }
};
```

## ✨ Boas Práticas

### 1. Estrutura de Dados Consistente

```sql
-- Sempre use esta estrutura base
CREATE TABLE {module}_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  position integer NOT NULL,
  color varchar DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE {module}_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  description text,
  column_id uuid REFERENCES {module}_columns(id),
  position integer DEFAULT 0,
  assignee uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. Naming Conventions

```tsx
// Hook de dados
const use{Module}KanbanData = () => {};

// Página
const {Module}KanbanPage = () => {};

// Componentes customizados
const {Module}Card = () => {};
const {Module}Column = () => {};

// Tipos
interface {Module}KanbanData {
  // ...
}
```

### 3. Configurações Reutilizáveis

```tsx
// src/config/kanbanConfigs.ts
export const salesKanbanConfig = {
  celebrationConfig: {
    enabled: true,
    messages: ['🎉 Venda fechada!', '💰 Negócio conquistado!'],
    showPoints: false,
    showAssignee: true
  },
  teamMembersTitle: 'Equipe de Vendas',
  showProjectsSummary: false
};

export const crmKanbanConfig = {
  celebrationConfig: {
    enabled: true,
    messages: ['🎯 Lead qualificado!'],
    showPoints: false
  },
  teamMembersTitle: 'Equipe de CRM',
  showProjectsSummary: false
};
```

### 4. Error Handling

```tsx
const useSalesKanbanData = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-kanban'],
    queryFn: fetchSalesData,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Sempre retorne valores padrão
  return {
    columns: data?.columns || [],
    tasks: data?.opportunities || [],
    profiles: data?.profiles || [],
    tags: data?.tags || [],
    taskTags: data?.taskTags || [],
    loading: isLoading,
    error: error?.message || null,
    // ... mutations
  };
};
```

### 5. Performance Optimization

```tsx
// Memoize computações pesadas
const teamMembersWithStats = useMemo(() => {
  return calculateTeamStats(profiles, tasks, columns);
}, [profiles, tasks, columns]);

// Use React.memo para componentes pesados
const SalesOpportunityCard = React.memo(({ task, index, onClick }) => {
  // ... component logic
});

// Lazy load componentes grandes
const SalesKanbanPage = lazy(() => import('./SalesKanbanPage'));
```

### 6. Testing

```tsx
// src/components/kanban/__tests__/GenericKanban.test.tsx
import { render, screen } from '@testing-library/react';
import { GenericKanban } from '../GenericKanban';

const mockDataHook = () => ({
  columns: [{ id: '1', title: 'Test Column', position: 0 }],
  tasks: [{ id: '1', title: 'Test Task', column_id: '1' }],
  profiles: [],
  tags: [],
  taskTags: [],
  loading: false,
  error: null,
  moveTask: jest.fn(),
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  refreshData: jest.fn()
});

test('renders kanban board with columns and tasks', () => {
  render(<GenericKanban useDataHook={mockDataHook} />);
  
  expect(screen.getByText('Test Column')).toBeInTheDocument();
  expect(screen.getByText('Test Task')).toBeInTheDocument();
});
```

## 🎯 Próximos Passos

Após implementar seu Kanban:

1. **Teste** todas as funcionalidades
2. **Configure** real-time se necessário
3. **Customize** componentes visuais
4. **Otimize** performance
5. **Documente** particularidades
6. **Monitore** erros em produção

## 📞 Suporte

Em caso de dúvidas:
1. Consulte os exemplos neste documento
2. Verifique o código do `KanbanBoard` existente
3. Use o troubleshooting guide
4. Teste com dados mock primeiro

---

**💡 Dica:** Comece sempre com a implementação mais simples e adicione funcionalidades gradualmente. O módulo foi projetado para crescer com suas necessidades!