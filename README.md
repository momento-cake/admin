# Momento Cake Admin

Sistema de administração para o Momento Cake ERP - Painel administrativo construído com Next.js 14, TypeScript, e Firebase.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **shadcn/ui** - Componentes de UI
- **Firebase** - Autenticação e Firestore
- **Lucide React** - Ícones

## 🎨 Design System

O projeto utiliza a paleta de cores oficial do Momento Cake:

- **Primário**: `#c4a484` (Marrom quente)
- **Secundário**: `#a38771` (Marrom escuro)
- **Background**: `#fafafa` (Cinza claro)
- **Foreground**: `#323232` (Cinza escuro)
- **Accent**: `#c4a484` (Mesmo que primário)

## 📋 Funcionalidades

### Autenticação
- [x] Login com email/senha
- [x] Controle de acesso por roles
- [x] Proteção de rotas
- [x] Verificação de conta ativa/inativa

### Dashboard
- [x] Visão geral do sistema
- [x] Estatísticas em tempo real
- [x] Atividades recentes
- [x] Status do sistema

### Gerenciamento
- [x] **Empresas**: Listagem e visualização
- [x] **Usuários**: Gerenciamento de usuários (admin only)
- [x] **Clientes**: Visualização de clientes
- [x] **Ingredientes**: Catálogo de ingredientes
- [x] **Receitas**: Gerenciamento de receitas
- [x] **Relatórios**: Análises e relatórios
- [x] **Configurações**: Configurações do sistema

## 🔐 Níveis de Acesso

### Administrador (`admin`)
- Acesso completo ao sistema
- Gerenciamento de usuários
- Gerenciamento de empresas
- Todas as funcionalidades

### Visualizador (`viewer`)
- Acesso de leitura
- Dashboard
- Visualização de empresas e dados
- Relatórios

### Master Admin (`admin` + `isInitialAdmin`)
- Todas as permissões de admin
- Pode gerenciar outros admins
- Não pode ser deletado
- Configurações avançadas

## 🗄️ Estrutura de Dados

### Coleções Firestore

```
/users/{userId}                          - Usuários da plataforma
/businesses/{businessId}                 - Empresas cadastradas
/businesses/{businessId}/users/{userId}  - Usuários da empresa
/businesses/{businessId}/clients/{id}    - Clientes da empresa
/vendors/{vendorId}                      - Fornecedores (compartilhados)
/sharedIngredients/{id}                  - Ingredientes globais
```

### Tipos de Dados

```typescript
// User Roles
type UserRole = 'admin' | 'viewer' | 'company_admin' | 'company_manager' | 'company_employee'

// Business Types
type BusinessType = 'formal_company' | 'solo_entrepreneur'
type BusinessStatus = 'active' | 'inactive' | 'suspended'

// Ingredient Units
type PackageUnit = 'kilogram' | 'gram' | 'liter' | 'milliliter' | 'unit'
```

## 🛠️ Instalação

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Projeto Firebase configurado

### Configuração

1. **Clone o repositório**
   ```bash
   cd admin
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o Firebase**
   ```bash
   # Copie o arquivo de exemplo
   cp .env.local.example .env.local
   
   # Edite .env.local com suas credenciais do Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Execute o projeto**
   ```bash
   npm run dev
   ```

5. **Acesse o sistema**
   ```
   http://localhost:3002
   ```
   
   Note: O servidor pode usar uma porta diferente se 3000 estiver ocupada.

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── dashboard/         # Páginas do dashboard
│   ├── businesses/        # Gerenciamento de empresas
│   ├── login/            # Página de login
│   └── layout.tsx        # Layout raiz
├── components/            # Componentes React
│   ├── auth/             # Componentes de autenticação
│   ├── layout/           # Componentes de layout
│   └── ui/               # Componentes UI (shadcn)
├── hooks/                # Custom hooks
├── lib/                  # Utilitários
├── types/                # Definições TypeScript
└── globals.css           # Estilos globais
```

## 🔒 Segurança

### Regras Firestore
O sistema utiliza regras de segurança robustas no Firestore:

- **Usuários**: Podem ver/editar próprio perfil
- **Admins**: Acesso completo exceto master admins
- **Master Admins**: Acesso irrestrito
- **Empresas**: Acesso baseado em autorização
- **Dados da Empresa**: Isolados por businessId

### Autenticação
- Verificação de email obrigatória para certos recursos
- Contas podem ser ativadas/desativadas
- Logout automático em contas desativadas
- Proteção contra ataques de força bruta

## 🚀 Deploy

### Vercel (Recomendado)

1. **Conecte seu repositório**
   - Importe o projeto no Vercel
   - Configure as variáveis de ambiente
   - Deploy automático

2. **Configure domínio Firebase**
   - Adicione o domínio do Vercel no Firebase Console
   - Configure Authentication domains

### Firebase Hosting

```bash
# Instale Firebase CLI
npm install -g firebase-tools

# Build do projeto
npm run build

# Deploy
firebase deploy --only hosting
```

## 🤝 Integração com Flutter App

Este admin panel integra perfeitamente com o app Flutter existente:

- **Mesma base de dados**: Firestore compartilhado
- **Mesmos usuários**: Sistema de auth unificado
- **Mesmas regras**: Firestore rules consistentes
- **Tipos compatíveis**: Modelos de dados alinhados

## 📊 Monitoramento

O sistema inclui:

- Dashboard com métricas em tempo real
- Log de atividades do sistema
- Monitoramento de status dos serviços
- Alertas de sistema
- Métricas de performance

## 🔧 Desenvolvimento

### Comandos disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Linting do código
npm run type-check   # Verificação de tipos
```

### Adicionando novos componentes

```bash
# Adicionar componente shadcn/ui
npx shadcn@latest add [component-name]
```

## 📝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário do Momento Cake.

## 🆘 Suporte

Para suporte técnico:

- 📧 Email: dev@momentocake.com
- 📱 WhatsApp: +55 (11) 99999-9999
- 🌐 Website: https://momentocake.com

---

**Momento Cake Admin** - Sistema de gestão profissional para confeitarias e padarias. 🎂✨
