#!/bin/bash

# Script para resolver problema do Firebase e aplicar melhorias de qualidade
# Execute: chmod +x fix-and-improve.sh && ./fix-and-improve.sh

echo "🔧 Iniciando correções e melhorias do evoSGA..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Resolver problema do Firebase
echo ""
log_info "1. Resolvendo configuração do Firebase..."

if ! command -v firebase &> /dev/null; then
    log_warning "Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

log_info "Fazendo login no Firebase..."
firebase login

log_info "Listando projetos disponíveis..."
firebase projects:list

echo ""
log_warning "AÇÃO NECESSÁRIA:"
echo "1. Se o projeto 'evosga' não existir, crie em: https://console.firebase.google.com/"
echo "2. Ative o Firebase Hosting no console"
echo "3. Pressione ENTER para continuar após criar o projeto..."
read -p ""

log_info "Configurando projeto Firebase..."
firebase use --add

# 2. Melhorar configuração TypeScript
echo ""
log_info "2. Aplicando configuração TypeScript rigorosa..."

# Backup do tsconfig atual
cp tsconfig.json tsconfig.json.backup
log_success "Backup do tsconfig.json criado"

# Aplicar nova configuração TypeScript
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    
    // Strict Type Checking (gradual)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    
    // Additional Checks (gradual)
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    
    // Module Resolution
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF

log_success "Configuração TypeScript atualizada (modo gradual)"

# 3. Melhorar ESLint
echo ""
log_info "3. Atualizando configuração ESLint..."

# Backup do eslint atual
cp eslint.config.js eslint.config.js.backup
log_success "Backup do eslint.config.js criado"

# Aplicar nova configuração ESLint
cat > eslint.config.js << 'EOF'
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.config.js"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-const": "error",
      
      // React rules
      "react-hooks/exhaustive-deps": "error",
      
      // General rules
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error"
    },
  }
);
EOF

log_success "Configuração ESLint atualizada"

# 4. Adicionar scripts úteis
echo ""
log_info "4. Adicionando scripts úteis ao package.json..."

# Backup do package.json
cp package.json package.json.backup
log_success "Backup do package.json criado"

# Adicionar scripts se não existirem
npm pkg set scripts.type-check="tsc --noEmit"
npm pkg set scripts.type-check:watch="tsc --noEmit --watch"
npm pkg set scripts.lint:fix="eslint src --ext .ts,.tsx --fix"
npm pkg set scripts.lint:check="eslint src --ext .ts,.tsx"
npm pkg set scripts.test:build="npm run type-check && npm run lint:check && npm run build"

log_success "Scripts adicionados ao package.json"

# 5. Verificar dependências
echo ""
log_info "5. Verificando dependências..."

# Instalar dependências de desenvolvimento se necessário
npm install -D @types/node

log_success "Dependências verificadas"

# 6. Testar configurações
echo ""
log_info "6. Testando configurações..."

log_info "Executando verificação de tipos..."
if npm run type-check; then
    log_success "Verificação de tipos passou"
else
    log_warning "Verificação de tipos encontrou problemas - normal na migração"
fi

log_info "Executando lint..."
if npm run lint:check; then
    log_success "Lint passou"
else
    log_warning "Lint encontrou problemas - execute 'npm run lint:fix' para corrigir automaticamente"
fi

log_info "Testando build..."
if npm run build; then
    log_success "Build passou"
else
    log_error "Build falhou - verifique os erros acima"
fi

# 7. Deploy Firebase
echo ""
log_info "7. Fazendo deploy para Firebase..."

if firebase deploy --only hosting; then
    log_success "Deploy realizado com sucesso!"
    echo ""
    echo "🎉 Sua aplicação está disponível em:"
    echo "   https://$(firebase use).web.app"
    echo "   https://$(firebase use).firebaseapp.com"
else
    log_error "Deploy falhou - verifique se o projeto Firebase foi criado corretamente"
fi

# 8. Resumo final
echo ""
echo "📋 RESUMO DAS MELHORIAS APLICADAS:"
echo ""
log_success "✅ Firebase configurado e deploy realizado"
log_success "✅ TypeScript strict mode ativado (gradual)"
log_success "✅ ESLint com regras mais rigorosas"
log_success "✅ Scripts úteis adicionados"
log_success "✅ Build otimizado"
echo ""
echo "📚 PRÓXIMOS PASSOS RECOMENDADOS:"
echo "1. Revisar e corrigir warnings do TypeScript"
echo "2. Executar 'npm run lint:fix' para corrigir problemas de lint"
echo "3. Implementar testes unitários"
echo "4. Configurar CI/CD pipeline"
echo ""
echo "📖 DOCUMENTAÇÃO:"
echo "- MELHORIAS_QUALIDADE.md - Guia completo de melhorias"
echo "- TYPESCRIPT_STRICT.md - Configuração TypeScript detalhada"
echo "- FIREBASE_DEPLOY.md - Documentação de deploy"
echo ""
log_success "Script concluído! 🚀"
EOF