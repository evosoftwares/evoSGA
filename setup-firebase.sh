#!/bin/bash

# Script de configuração automática do Firebase Hosting para evoSGA
# Execute: chmod +x setup-firebase.sh && ./setup-firebase.sh

echo "🚀 Configurando Firebase Hosting para evoSGA..."

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI encontrado"

# Fazer login no Firebase
echo "🔐 Fazendo login no Firebase..."
firebase login

# Verificar se já existe um projeto
if [ ! -f ".firebaserc" ]; then
    echo "📝 Configurando projeto Firebase..."
    
    # Criar arquivo .firebaserc
    cat > .firebaserc << EOF
{
  "projects": {
    "default": "evosga"
  }
}
EOF
    
    echo "✅ Arquivo .firebaserc criado"
fi

# Inicializar Firebase Hosting
echo "🏠 Inicializando Firebase Hosting..."
firebase init hosting --project evosga

# Fazer build da aplicação
echo "🔨 Fazendo build da aplicação..."
npm run build

# Fazer deploy
echo "🚀 Fazendo deploy para Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "🎉 Deploy concluído!"
echo "📱 Sua aplicação está disponível em:"
echo "   https://evosga.web.app"
echo "   https://evosga.firebaseapp.com"
echo ""
echo "📋 Comandos úteis:"
echo "   npm run deploy          - Build + Deploy completo"
echo "   npm run deploy:hosting  - Deploy apenas hosting"
echo "   firebase serve          - Preview local"
echo "   firebase hosting:channel:deploy preview - Deploy preview"
echo ""