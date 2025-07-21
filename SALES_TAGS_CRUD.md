# Sistema CRUD de Tags para Vendas

## 📋 Visão Geral

Este documento descreve a implementação completa do sistema CRUD (Create, Read, Update, Delete) para tags no módulo de vendas do evoSGA.

## 🚀 Funcionalidades Implementadas

### 1. **Hooks de Mutação** (`useSalesTagMutations.ts`)
- ✅ **Criar Tag**: `createSalesTagMutation`
- ✅ **Atualizar Tag**: `updateSalesTagMutation`  
- ✅ **Deletar Tag**: `deleteSalesTagMutation`

#### Características:
- **Validação de duplicatas**: Verifica se já existe uma tag com o mesmo nome
- **Atualização otimista**: Interface responde imediatamente, reverte em caso de erro
- **Verificação de uso**: Impede exclusão de tags que estão sendo usadas em oportunidades
- **Cache inteligente**: Atualiza automaticamente os dados em cache

### 2. **Interface de Gerenciamento** (`SalesTagManager.tsx`)
- ✅ **Modal dedicado** para gerenciar tags
- ✅ **Formulário de criação** com nome e seletor de cor
- ✅ **Lista de tags existentes** com opções de editar/excluir
- ✅ **Validações em tempo real**
- ✅ **Feedback visual** para ações do usuário

#### Recursos da Interface:
- **Paleta de cores predefinida**: 8 cores profissionais
- **Validação de formulário**: Nome obrigatório, máximo 50 caracteres
- **Estados de loading**: Indicadores visuais durante operações
- **Confirmação de exclusão**: Previne exclusões acidentais
- **Responsividade**: Funciona em desktop e mobile

### 3. **Integração com Oportunidades**
- ✅ **Botão de gerenciar tags** no modal de detalhes da oportunidade
- ✅ **Adicionar/remover tags** de oportunidades
- ✅ **Sincronização automática** entre componentes

## 🔧 Arquivos Modificados/Criados

### Novos Arquivos:
1. `src/hooks/sales/useSalesTagMutations.ts` - Hooks de mutação para tags
2. `src/components/sales/SalesTagManager.tsx` - Interface de gerenciamento
3. `SALES_TAGS_CRUD.md` - Esta documentação

### Arquivos Modificados:
1. `src/hooks/sales/useSalesKanbanMutations.ts` - Integração das mutações de tags
2. `src/components/sales/OpportunityDetailModal.tsx` - Botão de gerenciar tags
3. `src/components/sales/SalesKanbanBoard.tsx` - Props para funções de tag
4. `src/pages/SalesPage.tsx` - Handlers para operações de tag

## 🎯 Como Usar

### Para Usuários:
1. **Abrir uma oportunidade** no quadro Kanban
2. **Clicar no ícone de engrenagem** na seção "Tags"
3. **Gerenciar tags**:
   - Criar novas tags com nome e cor
   - Editar tags existentes
   - Excluir tags não utilizadas
4. **Adicionar/remover tags** da oportunidade

### Para Desenvolvedores:
```typescript
// Usar as mutações de tags
const { createSalesTag, updateSalesTag, deleteSalesTag } = useSalesTagMutations();

// Criar uma nova tag
await createSalesTag.mutateAsync({
  name: "Nova Tag",
  color: "#3B82F6"
});

// Atualizar uma tag
await updateSalesTag.mutateAsync({
  id: "tag-id",
  name: "Nome Atualizado",
  color: "#EF4444"
});

// Deletar uma tag
await deleteSalesTag.mutateAsync("tag-id");
```

## 🔒 Validações e Segurança

### Validações Implementadas:
- ✅ **Nome único**: Não permite tags duplicadas
- ✅ **Nome obrigatório**: Campo não pode estar vazio
- ✅ **Limite de caracteres**: Máximo 50 caracteres
- ✅ **Verificação de uso**: Impede exclusão de tags em uso
- ✅ **Sanitização**: Remove espaços extras

### Segurança:
- ✅ **RLS (Row Level Security)**: Políticas no Supabase
- ✅ **Autenticação**: Apenas usuários autenticados
- ✅ **Validação no backend**: Verificações no banco de dados

## 📊 Performance

### Otimizações:
- ✅ **Atualização otimista**: Interface responsiva
- ✅ **Cache inteligente**: Reduz requisições desnecessárias
- ✅ **Debounce**: Evita múltiplas requisições simultâneas
- ✅ **Lazy loading**: Componentes carregados sob demanda

## 🧪 Testes Recomendados

### Cenários de Teste:
1. **Criar tag com nome único** ✅
2. **Tentar criar tag com nome duplicado** ❌
3. **Editar tag existente** ✅
4. **Tentar deletar tag em uso** ❌
5. **Deletar tag não utilizada** ✅
6. **Adicionar tag a oportunidade** ✅
7. **Remover tag de oportunidade** ✅

## 🔄 Próximos Passos

### Melhorias Futuras:
- [ ] **Filtros por tags** no quadro Kanban
- [ ] **Estatísticas de uso** das tags
- [ ] **Tags favoritas** para acesso rápido
- [ ] **Importação/exportação** de tags
- [ ] **Tags hierárquicas** (categorias)

## 🐛 Troubleshooting

### Problemas Comuns:
1. **Tag não aparece**: Verifique se o cache foi atualizado
2. **Erro ao deletar**: Verifique se a tag não está em uso
3. **Duplicata não detectada**: Verifique a validação no frontend

### Logs Úteis:
```javascript
// Habilitar logs de debug
localStorage.setItem('debug', 'sales:tags');
```

## 📞 Suporte

Para dúvidas ou problemas relacionados ao sistema de tags:
1. Verifique os logs do console
2. Consulte a documentação do Supabase
3. Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Data**: Janeiro 2025  
**Autor**: Sistema evoSGA