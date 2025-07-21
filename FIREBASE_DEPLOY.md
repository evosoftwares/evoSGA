# Deploy para Firebase Hosting

Este documento explica como fazer deploy da aplicação evoSGA para Firebase Hosting.

## Pré-requisitos

1. **Firebase CLI instalado** (já configurado)
2. **Conta Google/Firebase**
3. **Projeto Firebase criado**

## Configuração Inicial

### 1. Criar Projeto no Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome do projeto: `evosga`
4. Ative o Google Analytics (opcional)
5. Crie o projeto

### 2. Configurar Firebase Hosting

1. No console do Firebase, vá para "Hosting"
2. Clique em "Começar"
3. Siga as instruções para configurar o domínio

### 3. Fazer Login no Firebase CLI

```bash
firebase login
```

### 4. Inicializar o Projeto

```bash
firebase init hosting
```

Selecione:
- Use an existing project: `evosga`
- Public directory: `dist`
- Configure as single-page app: `Yes`
- Set up automatic builds: `No`

### 5. Configurar o Projeto ID

Edite o arquivo `.firebaserc`:

```json
{
  "projects": {
    "default": "evosga"
  }
}
```

## Deploy

### Deploy Completo

```bash
npm run deploy
```

### Deploy Apenas Hosting

```bash
npm run deploy:hosting
```

### Deploy Manual

```bash
# 1. Build da aplicação
npm run build

# 2. Deploy para Firebase
firebase deploy --only hosting
```

## Configuração de Domínio Personalizado

### Para usar evosga.web.app:

1. No Firebase Console, vá para Hosting
2. Clique em "Adicionar domínio personalizado"
3. Digite: `evosga.web.app`
4. Siga as instruções para verificação DNS

### Configuração DNS (se necessário):

Se você possui o domínio `evosga.web.app`, configure os registros DNS:

```
Tipo: A
Nome: @
Valor: 151.101.1.195
       151.101.65.195

Tipo: CNAME
Nome: www
Valor: evosga.web.app
```

## Variáveis de Ambiente

Para produção, certifique-se de que as variáveis de ambiente estão configuradas:

1. Crie `.env.production`:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

2. Configure no Firebase Console (se necessário):
   - Vá para Project Settings
   - Aba "General"
   - Seção "Your apps"

## Comandos Úteis

```bash
# Ver projetos Firebase
firebase projects:list

# Servir localmente (preview)
firebase serve

# Ver logs de deploy
firebase hosting:channel:list

# Deploy para canal de preview
firebase hosting:channel:deploy preview

# Ver status do hosting
firebase hosting:sites:list
```

## Troubleshooting

### Erro de Autenticação
```bash
firebase logout
firebase login
```

### Erro de Projeto
```bash
firebase use --add
# Selecione o projeto correto
```

### Build Falha
```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build
```

## Estrutura de Arquivos

```
evoSGA/
├── firebase.json          # Configuração do Firebase
├── .firebaserc           # Projeto Firebase
├── dist/                 # Build da aplicação (gerado)
├── src/                  # Código fonte
└── package.json          # Scripts de deploy
```

## URLs Finais

- **Produção**: `https://evosga.web.app`
- **Preview**: `https://evosga--preview-xyz.web.app`
- **Console**: `https://console.firebase.google.com/project/evosga`

## Automação CI/CD (Opcional)

Para automatizar deploys via GitHub Actions, crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: evosga
```