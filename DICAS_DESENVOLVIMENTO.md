Entendido. De sênior para sênior. Sem rodeios.

---

### **TL;DR para Sêniores - evoSGA**

1.  **RLS é com `auth.uid()`**. Pare de usar `auth.role() = 'authenticated'`. A propagação do role no JWT pode ter latência ou falhar. A checagem `auth.uid() IS NOT NULL` é determinística e imediata. Aplique isso em cascata nas tabelas principais e de junção.

2.  **Tabelas de Junção Não Têm `id`**. Nossas tabelas *many-to-many* puras usam Chave Primária composta. Esqueça o `select('id')` ou `delete().eq('id', ...)`. O erro `42703` (coluna não existe) é quase sempre isso. Opere usando as colunas da chave composta.

3.  **Validação de FK é no Cliente**. O erro `23503` (FK violation) deve ser prevenido no front-end. Antes de qualquer `insert` em tabelas de junção, valide se as entidades relacionadas existem no estado global e se não há confusão de IDs.

4.  **Workflow: `types` depois de `push`**. Seu fluxo de trabalho com o schema deve ser: `npx supabase db push` e, imediatamente depois, `npx supabase gen types...`. Se os tipos estiverem dessincronizados, todo o resto vai falhar de formas misteriosas.

5.  **Debugging Rápido:** Erro `42501` (RLS) ou qualquer outro do PostgREST? Pegue a query, vá direto no **SQL Editor** do Supabase, envolva-a em um `EXPLAIN` ou apenas rode-a. É a forma mais rápida de isolar se o problema é de RLS, sintaxe ou lógica. O botão de teste de RLS na UI é um atalho pra isso.