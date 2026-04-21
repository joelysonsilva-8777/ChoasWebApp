# Dashboard Choas - Página Inicial

Uma interface completa de dashboard para o Choas (Observatório de Projetos Integradores), desenvolvida em Next.js com React e Tailwind CSS, baseada no design do aplicativo .NET C# desktop.

## 🎯 Funcionalidades Implementadas

### ✅ Autenticação
- Sistema de login/signup com Firebase Authentication
- Redirecionamento automático após login para o dashboard
- Proteção de rotas autenticadas

### ✅ Dashboard Principal (`/dashboard`)
- **Visão Geral**: Cards com estatísticas (equipes totais, projetos em andamento, prazos próximos, concluídos)
- **Cards de Equipes**: Exibição com progresso, status, membros e prazos
- **Atividades Recentes**: Feed com últimas atualizações das equipes
- **Criação Rápida**: Botão para criar novas equipes

### ✅ Gerenciamento de Equipes (`/dashboard/teams`)
- Lista completa de equipes do usuário
- Busca e filtros por status
- Modal para criar novas equipes
- Cards detalhados com:
  - Nome, curso e turma
  - Progresso visual (barra)
  - Status (Planejamento, Em Andamento, Concluído)
  - Membros com avatares
  - Prazos do projeto

### ✅ Chats (`/dashboard/chats`)
- Interface de conversa com lista de contatos
- Busca de conversas
- Janela de chat com histórico de mensagens
- Envio de mensagens
- Indicadores de mensagens não lidas
- Último horário de atualização

### ✅ Perfil (`/dashboard/profile`)
- Visualização e edição de dados pessoais
- Avatar personalizável
- Estatísticas do usuário
- Informações de contato

### ✅ Sidebar de Navegação
- Menu principal com 8 módulos:
  - Visão Geral
  - Chats
  - Conexões
  - Equipes
  - Docência
  - Calendário
  - Arquivos
  - Configurações
- Toggle para expandir/recolher sidebar
- Menu do usuário com opções de perfil, configurações e logout
- Indicador visual do item ativo

## 🎨 Design & Estilo

### Cores (Tailwind CSS)
- **Primária**: Blue (#2563EB)
- **Secundária**: Indigo (#4F46E5)
- **Neutros**: Slate (#0F172A - #F8FAFC)
- **Status**: Verde (Concluído), Azul (Em Andamento), Amber (Planejamento)

### Componentes
- Cards com hover effects
- Rounded corners (12px-24px)
- Shadows para profundidade
- Animações suaves
- Tipografia clara (Bold ExtraBold para títulos, Regular para texto)
- Ícones Lucide React

## 📁 Estrutura de Arquivos

```
Web/choaswebapp/
├── app/
│   ├── page.tsx                 # Home com redirecionamento
│   ├── login/
│   │   └── page.tsx            # Página de login/signup
│   └── dashboard/
│       ├── layout.tsx          # Layout principal com sidebar
│       ├── page.tsx            # Dashboard inicial
│       ├── teams/
│       │   └── page.tsx        # Gerenciamento de equipes
│       ├── chats/
│       │   └── page.tsx        # Interface de chats
│       └── profile/
│           └── page.tsx        # Perfil do usuário
├── lib/
│   ├── firebase.ts             # Config do Firebase
│   └── useAuth.ts              # Hook customizado de auth
├── globals.css                 # Estilos globais
└── layout.tsx                  # Layout root
```

## 🔧 Stack Técnico

- **Framework**: Next.js 16.2.4 (com Turbopack)
- **UI**: React 19 + Tailwind CSS
- **Auth**: Firebase Authentication
- **Database**: Firestore (para salvar equipes)
- **Ícones**: Lucide React
- **Linguagem**: TypeScript

## 🚀 Como Usar

### 1. Login
```
Acesse: http://localhost:3000/login
- Cadastre uma conta com email, nome, telefone e curso
- Ou faça login se já tem uma conta
```

### 2. Dashboard Principal
```
Após login, você será redirecionado para /dashboard
Visualize:
- Estatísticas de suas equipes
- Cards com progresso dos projetos
- Atividades recentes
```

### 3. Gerenciar Equipes
```
Clique em "Equipes" na sidebar ou em /dashboard/teams
- Crie novas equipes com nome, curso e turma
- Visualize todas as suas equipes
- Filtre por status ou busque por nome
```

### 4. Chats
```
Clique em "Chats" na sidebar
- Visualize suas conversas
- Envie mensagens
- Busque pessoas para conversar
```

### 5. Perfil
```
Clique no seu avatar na sidebar
- Visualize suas informações
- Edite seu perfil
- Configure suas preferências
```

## 🔐 Autenticação & Segurança

### Fluxo de Autenticação
1. Usuário acessa a plataforma
2. Se logado → redireciona para `/dashboard`
3. Se não logado → redireciona para `/login`
4. Logout remove a sessão e volta para login

### Proteção de Rotas
- Hook `useAuth()` verifica autenticação
- Dashboard requer usuário autenticado
- Dados são carregados do Firebase

## 🗄️ Integração com Firebase

### Collections
```
users/
  {userId}/
    - email
    - displayName
    - profile data

teams/
  {teamId}/
    - teamName
    - course
    - className
    - members
    - projectProgress
    - projectStatus
    - projectDeadline
    - createdAt
    - updatedAt

userTeams/
  {userId}_{teamId}/
    - userId
    - teamId
    - teamName
    - addedAt
```

### Operações
- **Listar equipes**: Query em `userTeams` por userId
- **Criar equipe**: Salva em `teams` + cria referência em `userTeams`
- **Carregar dados**: Busca team completo em `teams/{teamId}`

## 🎯 Próximos Passos (Roadmap)

- [ ] Integrar dados reais de equipes do Firebase
- [ ] Implementar sistema de chats com Firestore
- [ ] Criar página de Conexões (network)
- [ ] Implementar módulo de Calendário/Agenda
- [ ] Adicionar módulo de Docência para professores
- [ ] Sistema de upload de arquivos
- [ ] Notificações em tempo real
- [ ] Mobile responsive melhorado
- [ ] Modo dark/light

## 🛠️ Desenvolvimento Local

### Instalação
```bash
npm install
```

### Rodar em desenvolvimento
```bash
npm run dev
```

Acesse: `http://localhost:3000`

### Build para produção
```bash
npm run build
npm start
```

## 📝 Endpoints & Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Home (redirecionador) |
| `/login` | Login e Cadastro |
| `/dashboard` | Dashboard Principal |
| `/dashboard/teams` | Gerenciamento de Equipes |
| `/dashboard/chats` | Chats e Mensagens |
| `/dashboard/profile` | Perfil do Usuário |
| `/dashboard/connections` | Conexões (em breve) |
| `/dashboard/teaching` | Docência (em breve) |
| `/dashboard/calendar` | Calendário (em breve) |
| `/dashboard/files` | Arquivos (em breve) |

## 🎨 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1024px+)
- ✅ Tablet (768px+)
- ⚠️ Mobile (em melhoramento)

## 📚 Componentes Principais

### Dashboard Layout
- Sidebar com navegação
- Top bar com título da página
- Área de conteúdo principal
- Sistema de cores consistente

### Cards de Equipe
- Cabeçalho com nome e status
- Barra de progresso visual
- Membros com avatares
- Informações de prazo
- Botões de ação

### Chat Interface
- Lista de conversas
- Janela de chat com mensagens
- Input de mensagem
- Indicadores de status

## 🔍 Debug & Troubleshooting

### Erro: "Cannot find name 'Briefcase'"
- Solução: Importar ícone em `dashboard/page.tsx`

### Erro: "User is not authenticated"
- Solução: Fazer login primeiro em `/login`

### Equipes não aparecem
- Verificar se existem dados em Firestore
- Verificar se usuário está logado com UID correto
- Revisar permissões do Firestore

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- `SOLUTION_IMPLEMENTATION_SUMMARY.md` - Detalhes da arquitetura
- `DEBUG_GUIDE.md` - Guia de debug
- Código-fonte com comentários

---

**Desenvolvido com ❤️ para o Choas - Observatório de Projetos Integradores**
