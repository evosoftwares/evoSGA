# 🚀 Deploy Rápido - evoSGA Firebase Hosting

## Passos para Deploy

### 1. Primeira Configuração (apenas uma vez)

```bash
# 1. Fazer login no Firebase
firebase login

# 2. Criar projeto no Firebase Console
# - Acesse: https://console.firebase.google.com/
# - Clique em "Adicionar projeto"
# - Nome: evosga
# - Ative Hosting

# 3. Executar script de configuração
./setup-firebase.sh
```

### 2. Deploy Rápido (sempre que quiser atualizar)

```bash
# Opção 1: Deploy completo
npm run deploy

# Opção 2: Deploy apenas hosting
npm run deploy:hosting

# Opção 3: Manual
npm run build && firebase deploy --only hosting
```

### 3. URLs da Aplicação

- **Principal**: https://evosga.web.app
- **Alternativa**: https://evosga.firebaseapp.com
- **Console Firebase**: https://console.firebase.google.com/project/evosga

### 4. Comandos Úteis

```bash
# Preview local do build
firebase serve

# Ver logs
firebase hosting:channel:list

# Deploy para canal de teste
firebase hosting:channel:deploy preview

# Ver status
firebase projects:list
```

### 5. Troubleshooting

**Erro de login:**
```bash
firebase logout && firebase login
```

**Erro de projeto:**
```bash
firebase use evosga
```

**Build falha:**
```bash
rm -rf node_modules dist && npm install && npm run build
```

---

## ✅ Checklist de Deploy

- [ ] Firebase CLI instalado
- [ ] Login feito (`firebase login`)
- [ ] Projeto criado no console
- [ ] Build funcionando (`npm run build`)
- [ ] Deploy realizado (`npm run deploy`)
- [ ] Site acessível em evosga.web.app

---

**🎯 Objetivo**: Aplicação disponível em `evosga.web.app`