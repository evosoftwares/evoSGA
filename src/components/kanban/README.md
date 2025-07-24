# Módulo Kanban Genérico - evoSGA

Este módulo fornece um sistema Kanban reutilizável e altamente configurável que pode ser usado em diferentes contextos (tarefas, vendas, CRM, etc.).

## Estrutura

```
src/components/kanban/
├── index.ts              # Exports principais
├── types.ts              # Interfaces e tipos TypeScript
├── GenericKanban.tsx     # Componente principal reutilizável
├── KanbanBoard.tsx       # Implementação específica para tarefas
├── KanbanColumn.tsx      # Componente de coluna padrão
├── TaskCard.tsx          # Componente de card padrão
└── README.md            # Esta documentação
```

## Componentes

### GenericKanban

Componente principal que fornece toda a funcionalidade base do Kanban.

**Props principais:**
- `useDataHook`: Hook que retorna os dados do Kanban
- `selectedProjectId`: ID do projeto selecionado
- `celebrationConfig`: Configuração das celebrações
- `onTaskClick`: Callback para clique em tarefas
- `showTeamMembers`: Mostrar seção de membros da equipe
- `enableDragAndDrop`: Habilitar drag and drop

### KanbanBoard

Implementação específica para o sistema de tarefas do evoSGA.

## Como Usar

### 1. Uso Básico (Tarefas)

```tsx
import { KanbanBoard } from '@/components/kanban';

function TasksPage() {
  return <KanbanBoard />;
}
```

### 2. Uso Customizado com GenericKanban

```tsx
import React from 'react';
import { GenericKanban } from '@/components/kanban';
import { useSalesKanbanData } from '@/hooks/sales/useSalesKanbanData';

function SalesKanban() {
  return (
    <GenericKanban
      useDataHook={useSalesKanbanData}
      selectedProjectId={null}
      celebrationConfig={{
        enabled: true,
        messages: ['🎉 Venda fechada!', '💰 Negócio conquistado!'],
        showPoints: false,
        showAssignee: true
      }}
      showTeamMembers={true}
      teamMembersTitle=\"Equipe de Vendas\"
      enableDragAndDrop={true}
      enableTaskCreation={true}
    />
  );
}
```

### 3. Hook de Dados Customizado

O hook de dados deve implementar a interface `KanbanDataHook`:

```tsx
interface KanbanDataHook {
  columns: Column[];
  tasks: Task[];
  profiles: Profile[];
  tags: Tag[];  
  taskTags: TaskTag[];
  loading: boolean;
  error: string | null;
  moveTask: (taskId: string, sourceColumnId: string, destColumnId: string, destIndex: number) => void;
  createTask: (params: { taskData: Partial<Task>; columnId: string; projectId?: string | null }) => Promise<void>;
  updateTask: (params: { taskId: string; updates: Partial<Omit<Task, 'id'>>; projectId?: string | null }) => Promise<void>;
  deleteTask: (params: { taskId: string; projectId?: string | null }) => Promise<void>;
  refreshData: () => void;
}
```

Exemplo de implementação:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useSalesKanbanData = (projectId?: string | null) => {
  const queryClient = useQueryClient();
  
  // Buscar dados
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-kanban', projectId],
    queryFn: () => fetchSalesData(projectId)
  });

  // Mutations
  const moveMutation = useMutation({
    mutationFn: ({ taskId, sourceColumnId, destColumnId, destIndex }) => 
      moveSalesOpportunity(taskId, destColumnId, destIndex),
    onSuccess: () => queryClient.invalidateQueries(['sales-kanban'])
  });

  const createMutation = useMutation({
    mutationFn: ({ taskData, columnId }) => 
      createSalesOpportunity({ ...taskData, column_id: columnId }),
    onSuccess: () => queryClient.invalidateQueries(['sales-kanban'])
  });

  return {
    columns: data?.columns || [],
    tasks: data?.opportunities || [], // Mapeie para formato Task
    profiles: data?.profiles || [],
    tags: data?.tags || [],
    taskTags: data?.opportunityTags || [],
    loading: isLoading,
    error: error?.message || null,
    moveTask: moveMutation.mutate,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    refreshData: () => queryClient.invalidateQueries(['sales-kanban'])
  };
};
```

## Configurações Avançadas

### Celebrações Customizadas

```tsx
const celebrationConfig = {
  enabled: true,
  messages: [
    '🎯 Meta atingida!',
    '🚀 Sucesso total!',
    '⭐ Excelente trabalho!'
  ],
  duration: 5000,
  confettiEnabled: true,
  showPoints: true,
  showAssignee: true,
  getCustomMessage: (task) => `🎉 ${task.title} foi concluída com sucesso!`
};
```

### Componentes Customizados

```tsx
import CustomTaskCard from './CustomTaskCard';
import CustomColumn from './CustomColumn';

<GenericKanban
  TaskCardComponent={CustomTaskCard}
  ColumnComponent={CustomColumn}
  // ... outras props
/>
```

### Restrições de Coluna

```tsx
const getColumnRestrictions = (column) => {
  // Exemplo: impedir drag out de colunas concluídas
  const isCompleted = column.title.toLowerCase().includes('concluído');
  
  return {
    allowDragIn: true,
    allowDragOut: !isCompleted,
    allowTaskCreation: !isCompleted
  };
};

<GenericKanban
  getColumnRestrictions={getColumnRestrictions}
  // ... outras props
/>
```

## Exemplos de Uso

### 1. Sistema de Vendas

```tsx
function SalesKanbanPage() {
  const salesHook = useSalesKanbanData();
  
  return (
    <GenericKanban
      useDataHook={() => salesHook}
      celebrationConfig={{
        enabled: true,
        messages: ['💰 Venda fechada!', '🎯 Meta batida!'],
        showPoints: false
      }}
      showTeamMembers={true}
      teamMembersTitle=\"Vendedores\"
      showProjectsSummary={false}
    />
  );
}
```

### 2. Sistema de CRM

```tsx
function CRMKanbanPage() {
  const crmHook = useCRMKanbanData();
  
  return (
    <GenericKanban
      useDataHook={() => crmHook}
      celebrationConfig={{ enabled: false }}
      showTeamMembers={false}
      enableProjectGrouping={false}
    />
  );
}
```

### 3. Sistema de Recrutamento

```tsx
function RecruitmentKanbanPage() {
  const recruitmentHook = useRecruitmentKanbanData();
  
  return (
    <GenericKanban
      useDataHook={() => recruitmentHook}
      celebrationConfig={{
        enabled: true,
        messages: ['👏 Candidato contratado!'],
        showAssignee: true
      }}
      teamMembersTitle=\"Recrutadores\"
    />
  );
}
```

## Benefícios

### ✅ Reutilização
- Um único componente para múltiplos contextos
- Reduz duplicação de código
- Facilita manutenção

### ✅ Flexibilidade
- Hooks de dados customizáveis
- Componentes substituíveis
- Configurações granulares

### ✅ Consistência
- Interface uniforme entre diferentes módulos
- Comportamentos padronizados
- UX consistente

### ✅ Manutenibilidade
- Código centralizado
- Fácil de testar
- Mudanças propagam automaticamente

## Migração

Para migrar um Kanban existente para usar o GenericKanban:

1. **Identifique o hook de dados atual**
2. **Adapte para implementar KanbanDataHook**
3. **Substitua o componente por GenericKanban**
4. **Configure as props específicas**
5. **Teste a funcionalidade**

Exemplo de migração:

```tsx
// Antes
function OldSalesKanban() {
  const { data, loading } = useSalesData();
  // ... lógica específica
  return <CustomSalesKanbanBoard data={data} />;
}

// Depois
function NewSalesKanban() {
  return (
    <GenericKanban
      useDataHook={useSalesKanbanData}
      celebrationConfig={salesCelebrationConfig}
    />
  );
}
```

## Contribuição

Para adicionar novas funcionalidades ao módulo Kanban:

1. **Atualize os tipos** em `types.ts`
2. **Implemente no GenericKanban** como prop opcional
3. **Mantenha retrocompatibilidade**
4. **Documente a nova funcionalidade**
5. **Adicione testes**

Este módulo está em constante evolução para atender as necessidades do evoSGA!