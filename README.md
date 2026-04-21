# Choas Web

Choas Web é a aplicação web complementar do ecossistema Choas. Ela foi construída em Next.js com Firebase e concentra o acesso diário de alunos, professores, coordenadores e empresas em um único workspace responsivo.

O sistema cobre quatro grandes áreas:

1. Entrada pública com landing page e autenticação.
2. Workspace acadêmico com equipes, docência, calendário, arquivos, conexões e chat.
3. Workspace empresarial com projetos, contato institucional, conexões, chat e perfil.
4. Persistência em Firebase com Firestore, Auth e Storage, tudo protegido por regras explícitas.

## Visão Geral

O front-end usa o App Router do Next.js e faz a navegação com layouts por rota. O comportamento muda conforme o papel do usuário salvo no documento de perfil em Firestore.

Quando o usuário autentica:

1. A landing page verifica se existe sessão ativa.
2. Se existir, a aplicação envia o usuário para a área autenticada.
3. O layout da área autenticada carrega o perfil e decide qual navegação mostrar.
4. A interface acadêmica e a interface empresarial compartilham componentes base, mas não compartilham o mesmo menu principal.

## Stack

- Next.js 16.2.4 com App Router
- React 19.2.4
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Firebase Storage
- Lucide React para ícones

## Perfis Do Sistema

O campo `role` do perfil define o comportamento principal da interface.

| Papel | Objetivo principal | Observações |
| --- | --- | --- |
| `student` | Acompanhar equipes, tarefas, chat e calendário | Visão acadêmica padrão |
| `professor` | Orientar equipes e acompanhar projetos | Pode ver e gerir conteúdo acadêmico conforme regras |
| `coordinator` | Acompanhar e administrar o ecossistema acadêmico | Tem privilégios de coordenação |
| `company` | Acompanhar projetos, contatos institucionais e conversa | Usa navegação empresarial e vê projetos em modo leitura |

## Estrutura De Navegação

O menu lateral é definido em `lib/appNavigation.ts` e renderizado por `components/AppShell.tsx`.

### Navegação Acadêmica

- Visão Geral: `/dashboard`
- Chats: `/chat`
- Conexões: `/dashboard/connections`
- Equipes: `/dashboard/teams`
- Docência: `/dashboard/teaching`
- Calendário: `/dashboard/calendar`
- Arquivos: `/dashboard/files`
- Configurações: `/settings`

### Navegação Empresarial

- Chats: `/dashboard/chats` e suporte ao fluxo de chat
- Conexões: `/dashboard/connections`
- Projetos: `/dashboard/projetos`
- Contato Institucional: `/dashboard/contato-institucional`

### Acesso Sempre Disponível

No rodapé do menu existem atalhos fixos para:

- Perfil: `/profile`
- Ajustes: `/settings`
- Sair da conta

## Rotas Principais

### Público

- `/` - landing page institucional com hero, recursos e contato
- `/login` - autenticação

### Área Acadêmica

- `/dashboard` - ponto de entrada do workspace acadêmico
- `/dashboard/teams` - lista de equipes do usuário
- `/dashboard/teams/[teamId]` - workspace detalhado da equipe
- `/dashboard/teaching` - área docente
- `/dashboard/calendar` - calendário e linhas do tempo
- `/dashboard/files` - arquivos e materiais
- `/dashboard/connections` - conexões institucionais e contatos
- `/chat` - chat principal
- `/profile` - edição do perfil
- `/settings` - preferências e configurações

### Área Empresarial

- `/dashboard/projetos` - catálogo de projetos com busca e filtros
- `/dashboard/contato-institucional` - diretório institucional de docentes e coordenação
- `/dashboard/teams/[teamId]` - visão somente leitura de um projeto/equipe
- `/dashboard/chats` - chat no contexto empresarial
- `/dashboard/connections` - conexões empresariais
- `/profile` - perfil da empresa
- `/settings` - ajustes da empresa

## Como O Shell Funciona

O componente `AppShell` centraliza a experiência visual do workspace:

- barra lateral fixa no desktop
- menu móvel com overlay
- cabeçalho compacto no mobile
- avatar, nome e email do usuário no rodapé
- botões permanentes de perfil, ajustes e logout

O shell recebe uma lista de itens de navegação e escolhe quais mostrar de acordo com o papel do usuário. Isso é o que impede a empresa de ver o mesmo menu de alunos e professores.

## Arquitetura De Dados

### Firestore

Principais coleções usadas pela aplicação:

- `users` - perfil completo do usuário, avatar, dados acadêmicos e dados empresariais
- `teams` - projetos/equipes integradoras
- `userTeams` - referência rápida das equipes associadas a cada usuário
- `teachingClasses` - turmas acadêmicas
- `userClassEnrollments` - vínculo entre usuário e turma
- `conversations` - conversas privadas ou em grupo
- `conversations/{conversationId}/messages` - mensagens do chat
- `connections` - conexões entre pessoas e/ou entidades
- `userConnections` - atalho de conexões por usuário

### Documentos De Projeto

Um documento de `teams` guarda o resumo do projeto, membros, progresso, marcos, cards, notificações, CSD e metadados de mídia. A interface consome esse documento de forma normalizada para mostrar:

- nome do projeto
- curso e turma
- professor focal e supervisores
- membros alunos e docentes
- progresso e prazo
- marcos e cards
- arquivos e permissões

### Storage

Arquivos binários ficam no Firebase Storage. Os principais caminhos são:

- `profile-photos/...` - fotos de perfil e avatar em imagem real
- `team-assets/...` - arquivos dos projetos/equipes
- `teaching-class-assets/...` - arquivos das turmas
- `teaching-class-icons/...` - ícones das turmas
- `chat-assets/...` - anexos de mensagens

## Serviços Principais

### `lib/useAuth.ts`

Hook simples que escuta o estado do Firebase Auth e retorna o usuário atual. Ele é usado pelas páginas protegidas para saber quando carregar dados ou redirecionar.

### `lib/firebase.ts`

Centraliza a inicialização do Firebase App, Firestore, Auth e Storage. Também lê as variáveis de ambiente públicas.

### `lib/userProfileService.ts`

Responsável por:

- carregar perfil por `userId`
- criar perfil de aluno, professor ou empresa
- atualizar dados pessoais e empresariais
- enviar foto de perfil para o Storage
- consultar múltiplos perfis por lista de IDs

É aqui que ficam os campos de empresa como:

- nome da empresa
- razão social
- CNPJ
- segmento
- contato responsável
- telefone
- site
- descrição institucional

### `lib/teamWorkspaceService.ts`

Responsável por carregar e normalizar os projetos/equipes:

- busca documento de equipe por `teamId`
- carrega projetos do usuário a partir de `userTeams`
- carrega todos os projetos para a visão empresarial
- separa membros alunos e docentes
- monta rótulos como progresso, liderança e professor focal
- identifica logo do projeto a partir dos assets

### `lib/teachingClassWorkspaceService.ts`

Cuida da leitura e organização das turmas acadêmicas:

- carrega turmas por ID
- carrega as turmas vinculadas ao usuário
- normaliza alunos e professores
- monta contadores e textos de busca

### `lib/connectionWorkspaceService.ts`

Organiza conexões entre usuários e entidades. É usado nas áreas de conexões e contatos.

### `lib/chatService.ts`

Gerencia conversas, mensagens, participantes, previews de link e anexos.

### `lib/chatMedia.ts`

Responsável por paths, validação e upload de mídia do chat.

### `lib/calendarWorkspaceService.ts`

Agrupa eventos, turmas, perfis e itens de calendário em uma visão única.

### `lib/avatarService.ts`

Normaliza e renderiza o avatar do usuário, inclusive no formato antigo e no formato novo.

### `lib/appNavigation.ts`

Define os IDs de navegação, os itens acadêmicos e os itens empresariais, além de mapear o pathname ativo para o item correspondente.

## Fluxos De Uso

### Usuário Acadêmico

1. Acessa a landing page.
2. Entra na plataforma.
3. Cai no workspace acadêmico.
4. Usa equipes, docência, calendário, arquivos, conexões e chat.
5. Acessa perfil e ajustes pelo rodapé do shell.

### Empresa

1. Acessa a plataforma com perfil `company`.
2. Recebe um menu empresarial separado.
3. Navega por projetos, contato institucional, conexões e chat.
4. Abre um projeto em modo somente leitura.
5. Visualiza membros, arquivos e progresso sem editar o conteúdo.
6. Pode editar perfil e configurações da empresa.

## Segurança E Regras

As regras do Firebase são parte essencial da solução.

### Firestore

O arquivo `Firebase/firestore.rules` controla:

- leitura de `users`
- leitura e escrita de `conversations`
- leitura e escrita de `teams`
- leitura de `taskCards` e `milestones`
- leitura e escrita de `teachingClasses`
- leitura e escrita de `userTeams` e `userClassEnrollments`

O ajuste mais importante para o fluxo empresarial é que a empresa pode ler projetos e seus detalhes, mas não pode escrever em estrutura de equipe, cards, marcos ou documentos de origem acadêmica.

### Storage

O arquivo `Firebase/storage.rules` controla:

- fotos de perfil
- arquivos de equipe
- arquivos de turma
- ícones de turma
- anexos de chat

O modelo de Storage é compatível com leitura empresarial dos arquivos do projeto, mas preserva as restrições de escrita por dono e papel.

## Configuração Local

### Requisitos

- Node.js 20.9.0 ou superior
- npm
- Projeto Firebase configurado

### Instalação

```bash
npm install
```

### Variáveis De Ambiente

Crie um arquivo `.env.local` na raiz do projeto com os valores do Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
```

O arquivo `lib/firebase.ts` ainda possui valores padrão para desenvolvimento local, mas em produção o ideal é sempre configurar as variáveis corretamente.

### Executar Em Desenvolvimento

```bash
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

### Verificação

```bash
npm run lint
npm run build
```

## Deploy No Vercel

O projeto está preparado para deploy na pasta `Web/choaswebapp`.

### Passos

1. Importe o repositório no Vercel.
2. Defina o root do projeto como `Web/choaswebapp`.
3. Deixe o Vercel usar o `vercel.json` do projeto.
4. Configure as variáveis de ambiente do Firebase.
5. Faça o deploy.

### Arquivo `vercel.json`

O arquivo de Vercel define:

- framework Next.js
- comando de instalação `npm ci`
- comando de build `npm run build`

## Estrutura De Pastas

Resumo das pastas mais importantes:

- `app/` - rotas e layouts do Next.js
- `components/` - componentes reutilizáveis da interface
- `lib/` - serviços, normalizadores, auth e integrações Firebase
- `public/` - imagens e assets estáticos
- `Firebase/` - regras de Firestore e Storage

## Problemas Comuns

### `Missing or insufficient permissions`

Normalmente significa uma destas situações:

- regra do Firestore ou Storage ainda não foi publicada
- o usuário não possui o papel esperado
- a coleção ou documento foi consultado por um caminho não permitido
- o perfil do usuário em `users` não está com o `role` correto

### A empresa vê o menu acadêmico

Isso acontece se a sessão ainda não carregou o perfil ou se a rota não está usando o layout empresarial correto. O shell só mostra o menu certo quando o `role` já foi resolvido.

### Build travado por arquivo de lock

Se o build falhar por lock do Next, encerre o processo de desenvolvimento ativo e rode `npm run build` novamente.

### Imagem de perfil não atualiza

Confira se:

- o Storage está liberado pelas regras
- o usuário está autenticado
- a foto está indo em formato Data URL ou URL pública válida

## Observações Importantes

- A interface empresarial é propositalmente separada da acadêmica.
- Projetos da empresa são leitura, não edição.
- Perfil e ajustes continuam disponíveis no rodapé do menu.
- As regras Firebase precisam estar alinhadas com o código para evitar erros de permissão.
- O sistema foi pensado para evoluir sem misturar visões de aluno, professor, coordenador e empresa.

## Resumo Final

Este projeto entrega uma base completa para operação acadêmica e institucional:

- landing page pública
- autenticação Firebase
- dashboards por papel
- projetos e equipes
- contato institucional
- chat e conexões
- perfis acadêmicos e empresariais
- armazenamento de arquivos
- regras de segurança explícitas

Se você estiver mantendo o sistema, o ponto mais importante é preservar a separação entre a navegação acadêmica e a navegação empresarial, porque isso define toda a experiência de uso do produto.
