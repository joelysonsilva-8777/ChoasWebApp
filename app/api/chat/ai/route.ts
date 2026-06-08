import {
  AI_CHAT_RESPONSE_SCHEMA,
  type AiChatCodeBlock,
  type AiChatHistoryItem,
  type AiChatLink,
  type AiChatReply,
} from '../../../../lib/aiChatTypes';

export const runtime = 'nodejs';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1';
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://choas-web-app.vercel.app',
];

type RequestContext = {
  userName?: string;
  role?: string;
  projectContext?: string;
};

type ChatAiRequestBody = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getField(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  const foundKey = Object.keys(source).find((key) => normalizedKeys.has(key.toLowerCase()));
  return foundKey ? source[foundKey] : undefined;
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeMultilineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\r\n/g, '\n').trim().slice(0, maxLength);
}

function stringifyCompact(value: unknown, maxLength: number): string {
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return '';
  }
}

function normalizeLooseText(value: unknown, maxLength: number): string {
  if (typeof value === 'string') {
    return normalizeMultilineText(value, maxLength);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).slice(0, maxLength);
  }

  if (Array.isArray(value) || isRecord(value)) {
    return stringifyCompact(value, maxLength);
  }

  return '';
}

function getHeaderSafeOrigin(request: Request): string {
  const origin = request.headers.get('origin') || '';
  const host = request.headers.get('host') || '';
  const configuredOrigins = (process.env.CHOAS_AI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const hostOrigins = host ? [`https://${host}`, `http://${host}`] : [];
  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins, ...hostOrigins]);

  if (!origin) {
    return '*';
  }

  if (allowedOrigins.has('*') || allowedOrigins.has(origin)) {
    return origin;
  }

  return '';
}

function buildCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const safeOrigin = getHeaderSafeOrigin(request);

  if (safeOrigin) {
    headers.set('Access-Control-Allow-Origin', safeOrigin);
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Choas-AI-Client-Key');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');

  return headers;
}

function mergeHeaders(...headersList: Array<Headers | HeadersInit | undefined>): Headers {
  const merged = new Headers();

  headersList.forEach((headers) => {
    if (!headers) {
      return;
    }

    new Headers(headers).forEach((value, key) => {
      merged.set(key, value);
    });
  });

  return merged;
}

function jsonResponse(request: Request, body: unknown, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: mergeHeaders(buildCorsHeaders(request), init?.headers),
  });
}

function stripMarkdownArtifacts(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/__+/g, '')
    .replace(/`/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .trim();
}

function normalizeForTopicCheck(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isClearlyOffTopic(message: string): boolean {
  const normalized = normalizeForTopicCheck(message);
  const offTopicTerms = [
    'futebol',
    'placar',
    'campeonato',
    'libertadores',
    'brasileirao',
    'time',
    'gol',
    'aposta',
    'cassino',
    'loteria',
    'horoscopo',
    'fofoca',
    'celebridade',
    'novela',
    'reality show',
    'bbb',
  ];
  const studyTerms = [
    'projeto',
    'estudo',
    'pesquisa',
    'academ',
    'faculdade',
    'curso',
    'turma',
    'orientador',
    'professor',
    'tarefa',
    'trabalho',
    'artigo',
    'tcc',
    'choas',
    'chat',
    'equipe',
    'calendario',
    'arquivo',
    'conexao',
    'dashboard',
    'funcionalidade',
    'documentacao',
  ];

  const hasOffTopic = offTopicTerms.some((term) => normalized.includes(term));
  const hasStudyContext = studyTerms.some((term) => normalized.includes(term));

  return hasOffTopic && !hasStudyContext;
}

function createScopeReply(): AiChatReply {
  return {
    kind: 'refusal',
    title: 'Foco no estudo',
    summary: 'Posso ajudar com estudos, pesquisas, projetos academicos e uso do Choas. Esse assunto foge do contexto da plataforma.',
    highlights: [
      'Traga uma duvida de projeto, entrega, equipe ou disciplina.',
      'Tambem posso explicar como usar chats, calendario, conexoes, arquivos e equipes.',
    ],
    steps: [],
    links: [],
    codeBlocks: [],
    followUp: 'Me diga qual projeto, atividade ou funcionalidade voce quer destravar agora.',
  };
}

function createServerIssueReply(summary: string): AiChatReply {
  return {
    kind: 'clarify',
    title: 'IA indisponivel',
    summary,
    highlights: [],
    steps: [
      'Configure OPENAI_API_KEY nas variaveis de ambiente da Vercel.',
      'Opcionalmente defina OPENAI_MODEL para trocar o modelo usado pela assistente.',
      'Depois do deploy, volte ao chat e envie a pergunta novamente.',
    ],
    links: [],
    codeBlocks: [],
    followUp: 'Quando a chave estiver ativa, eu continuo daqui.',
  };
}

function sanitizeLink(link: Partial<AiChatLink>): AiChatLink | null {
  const label = normalizeText(link.label, 90) || 'Fonte';
  const url = normalizeText(link.url, 500);
  const note = normalizeText(link.note, 180);

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return null;
  }

  return { label, url, note };
}

function sanitizeCodeBlock(block: Partial<AiChatCodeBlock>): AiChatCodeBlock | null {
  const code = normalizeMultilineText(block.code, 2000);

  if (!code) {
    return null;
  }

  return {
    language: normalizeText(block.language, 40),
    title: normalizeText(block.title, 90) || 'Codigo',
    code,
  };
}

function normalizeReply(value: unknown, fallbackText = ''): AiChatReply {
  const data = isRecord(value) ? value : {};
  const kind = data.kind === 'refusal' || data.kind === 'clarify' ? data.kind : 'answer';
  const rawLinks = Array.isArray(data.links) ? data.links : [];
  const rawCodeBlocks = Array.isArray(data.codeBlocks) ? data.codeBlocks : [];

  return {
    kind,
    title: stripMarkdownArtifacts(normalizeText(data.title, 90) || 'Resposta'),
    summary: stripMarkdownArtifacts(normalizeText(data.summary, 900) || stripMarkdownArtifacts(fallbackText) || 'Nao consegui montar uma resposta completa agora.'),
    highlights: Array.isArray(data.highlights)
      ? data.highlights.map((item) => stripMarkdownArtifacts(normalizeText(item, 220))).filter(Boolean).slice(0, 5)
      : [],
    steps: Array.isArray(data.steps)
      ? data.steps.map((item) => stripMarkdownArtifacts(normalizeText(item, 260))).filter(Boolean).slice(0, 6)
      : [],
    links: rawLinks.map((item) => sanitizeLink(item as Partial<AiChatLink>)).filter((item): item is AiChatLink => Boolean(item)).slice(0, 5),
    codeBlocks: rawCodeBlocks.map((item) => sanitizeCodeBlock(item as Partial<AiChatCodeBlock>)).filter((item): item is AiChatCodeBlock => Boolean(item)).slice(0, 3),
    followUp: stripMarkdownArtifacts(normalizeText(data.followUp, 240)),
  };
}

function extractOutputText(response: any): { text: string; links: AiChatLink[] } {
  const textParts: string[] = [];
  const links: AiChatLink[] = [];
  const seenUrls = new Set<string>();

  if (typeof response?.output_text === 'string') {
    textParts.push(response.output_text);
  }

  if (Array.isArray(response?.output)) {
    response.output.forEach((item: any) => {
      if (!Array.isArray(item?.content)) {
        return;
      }

      item.content.forEach((content: any) => {
        if (typeof content?.text === 'string') {
          textParts.push(content.text);
        }

        if (Array.isArray(content?.annotations)) {
          content.annotations.forEach((annotation: any) => {
            const url = normalizeText(annotation?.url, 500);
            if (!url || seenUrls.has(url)) {
              return;
            }

            const link = sanitizeLink({
              label: annotation?.title || annotation?.site_name || 'Fonte consultada',
              url,
              note: 'Fonte usada na pesquisa.',
            });

            if (link) {
              seenUrls.add(url);
              links.push(link);
            }
          });
        }
      });
    });
  }

  return {
    text: textParts.join('\n').trim(),
    links,
  };
}

function normalizeMessageRole(value: unknown): AiChatHistoryItem['role'] | null {
  const role = normalizeForTopicCheck(normalizeLooseText(value, 80));

  if (!role || role === 'system' || role === 'developer') {
    return null;
  }

  if (['assistant', 'ai', 'ia', 'bot', 'model', 'openai', 'codex'].some((term) => role.includes(term))) {
    return 'assistant';
  }

  if (['user', 'usuario', 'human', 'client', 'cliente', 'student', 'aluno', 'professor', 'teacher', 'me'].some((term) => role.includes(term))) {
    return 'user';
  }

  return null;
}

function extractMessageContent(value: unknown, maxLength: number): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isRecord(item)) {
          return normalizeLooseText(getField(item, ['text', 'Text', 'content', 'Content', 'message', 'Message', 'value', 'Value']), maxLength);
        }

        return normalizeLooseText(item, maxLength);
      })
      .filter(Boolean)
      .join('\n')
      .slice(0, maxLength);
  }

  return normalizeLooseText(value, maxLength);
}

function normalizeMessageItem(item: unknown): AiChatHistoryItem | null {
  if (typeof item === 'string') {
    const content = normalizeMultilineText(item, 1600);
    return content ? { role: 'user', content } : null;
  }

  if (!isRecord(item)) {
    return null;
  }

  const content = extractMessageContent(
    getField(item, ['content', 'Content', 'text', 'Text', 'message', 'Message', 'prompt', 'Prompt', 'question', 'Question', 'value', 'Value']),
    1600,
  );
  const role = normalizeMessageRole(getField(item, ['role', 'Role', 'sender', 'Sender', 'author', 'Author', 'type', 'Type'])) || 'user';

  if (!content) {
    return null;
  }

  return { role, content };
}

function getDirectPrompt(body: ChatAiRequestBody): string {
  return extractMessageContent(
    getField(body, [
      'prompt',
      'Prompt',
      'message',
      'Message',
      'input',
      'Input',
      'question',
      'Question',
      'content',
      'Content',
      'text',
      'Text',
    ]),
    1600,
  );
}

function normalizeMessages(body: ChatAiRequestBody): AiChatHistoryItem[] {
  const conversation = getField(body, [
    'messages',
    'Messages',
    'history',
    'History',
    'conversation',
    'Conversation',
    'chatHistory',
    'ChatHistory',
  ]);
  const messages = Array.isArray(conversation)
    ? conversation.map((item) => normalizeMessageItem(item)).filter((item): item is AiChatHistoryItem => Boolean(item)).slice(-12)
    : [];
  const directPrompt = getDirectPrompt(body);

  if (directPrompt && messages[messages.length - 1]?.content !== directPrompt) {
    messages.push({ role: 'user', content: directPrompt });
  }

  return messages.slice(-12);
}

function pickFirstText(maxLength: number, ...values: unknown[]): string {
  for (const value of values) {
    const text = normalizeLooseText(value, maxLength);

    if (text) {
      return text;
    }
  }

  return '';
}

function buildProjectsContext(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeMultilineText(value, 5000);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 8)
      .map((project, index) => {
        if (!isRecord(project)) {
          return normalizeLooseText(project, 500);
        }

        const title = pickFirstText(100, getField(project, ['name', 'Name', 'title', 'Title', 'projectName', 'ProjectName'])) || `Projeto ${index + 1}`;
        const status = pickFirstText(80, getField(project, ['status', 'Status', 'stage', 'Stage']));
        const role = pickFirstText(80, getField(project, ['role', 'Role', 'userRole', 'UserRole']));
        const deadline = pickFirstText(80, getField(project, ['deadline', 'Deadline', 'dueDate', 'DueDate', 'endDate', 'EndDate']));
        const description = pickFirstText(420, getField(project, ['description', 'Description', 'summary', 'Summary', 'details', 'Details']));
        return [title, status && `Status: ${status}`, role && `Papel: ${role}`, deadline && `Prazo: ${deadline}`, description]
          .filter(Boolean)
          .join(' | ');
      })
      .filter(Boolean)
      .join('\n')
      .slice(0, 5000);
  }

  return normalizeLooseText(value, 5000);
}

function appendContextPart(parts: string[], label: string, value: string) {
  if (!value) {
    return;
  }

  const content = `${label}: ${value}`;
  if (!parts.includes(content)) {
    parts.push(content);
  }
}

function normalizeRequestContext(body: ChatAiRequestBody): Required<RequestContext> {
  const contextValue = getField(body, ['context', 'Context', 'userContext', 'UserContext']);
  const context = isRecord(contextValue) ? contextValue : {};
  const userName = pickFirstText(
    120,
    getField(context, ['userName', 'UserName', 'displayName', 'DisplayName', 'name', 'Name']),
    getField(body, ['userName', 'UserName', 'displayName', 'DisplayName', 'name', 'Name']),
  ) || 'usuario autenticado';
  const role = pickFirstText(
    80,
    getField(context, ['role', 'Role', 'profileRole', 'ProfileRole']),
    getField(body, ['role', 'Role', 'profileRole', 'ProfileRole']),
  ) || 'student';
  const parts: string[] = [];
  const contextText = isRecord(contextValue) ? '' : normalizeLooseText(contextValue, 3500);

  appendContextPart(parts, 'Contexto enviado pelo aplicativo', contextText);
  appendContextPart(parts, 'Projeto atual', pickFirstText(
    3500,
    getField(context, ['projectContext', 'ProjectContext', 'currentProject', 'CurrentProject']),
    getField(body, ['projectContext', 'ProjectContext', 'currentProject', 'CurrentProject']),
  ));
  appendContextPart(parts, 'Projetos do usuario', buildProjectsContext(
    getField(context, ['projects', 'Projects', 'projectSummaries', 'ProjectSummaries', 'workspaces', 'Workspaces'])
      ?? getField(body, ['projects', 'Projects', 'projectSummaries', 'ProjectSummaries', 'workspaces', 'Workspaces']),
  ));
  appendContextPart(parts, 'Resumo adicional', pickFirstText(
    3500,
    getField(context, ['summary', 'Summary', 'details', 'Details', 'notes', 'Notes']),
    getField(body, ['summary', 'Summary', 'details', 'Details', 'notes', 'Notes']),
  ));

  return {
    userName,
    role,
    projectContext: parts.join('\n\n').slice(0, 9000),
  };
}

function buildInstructions(context: Required<RequestContext>): string {
  return [
    'Voce e Codex IA dentro do Choas, uma plataforma academica para projetos integradores.',
    'Seu trabalho e ajudar com estudos, pesquisas, projetos, equipes, entregas, organizacao academica e uso das funcionalidades do Choas.',
    'Voce pode usar o contexto dos projetos/equipes do usuario para responder perguntas sobre andamento, prazos, marcos, tarefas e proximos passos.',
    'Voce tambem pode explicar funcionalidades do Choas: chats, anexos, figurinhas, conexoes, equipes, projetos, calendario, arquivos, perfil, configuracoes e area empresarial.',
    'Se o pedido for banal ou fora do contexto de estudo/projeto/plataforma, recuse de forma educada e redirecione para um tema academico ou do Choas.',
    'Exemplos fora do escopo: placar de futebol, apostas, fofoca, celebridades, horoscopo e entretenimento casual sem relacao com estudo.',
    'Se o usuario pedir pesquisa, referencias, dados atuais ou links, use pesquisa web quando necessario e devolva URLs somente no campo links.',
    'Nao use markdown, titulos com #, listas com hifen, codigo cercado ou links no formato markdown. Responda apenas com JSON valido seguindo o schema.',
    'Se precisar mostrar codigo, coloque os trechos no campo codeBlocks, nunca dentro de summary, highlights ou steps.',
    'Mantenha a resposta curta, visualmente organizada e pronta para ser renderizada em cards de chat.',
    `Usuario: ${context.userName || 'usuario autenticado'}. Perfil: ${context.role || 'student'}.`,
    'Contexto carregado do Choas:',
    context.projectContext || 'Nenhum contexto de projeto foi carregado ainda.',
  ].join('\n');
}

function buildOpenAiInput(messages: AiChatHistoryItem[]) {
  return messages.slice(-10).map((message) => ({
    role: message.role,
    content: normalizeMultilineText(message.content, 1600),
  })).filter((message) => message.content);
}

function buildPlainTextReply(reply: AiChatReply): string {
  const lines = [
    reply.title,
    reply.summary,
    ...reply.highlights,
    ...reply.steps,
    ...reply.links.map((link) => `${link.label}: ${link.url}`),
    reply.followUp,
  ].filter(Boolean);

  return lines.join('\n');
}

function createApiPayload(reply: AiChatReply, success = true) {
  const content = buildPlainTextReply(reply);

  return {
    success,
    reply,
    response: reply,
    kind: reply.kind,
    title: reply.title,
    summary: reply.summary,
    content,
    message: content,
    text: content,
    highlights: reply.highlights,
    steps: reply.steps,
    links: reply.links,
    codeBlocks: reply.codeBlocks,
    followUp: reply.followUp,
  };
}

async function callOpenAi(payload: Record<string, unknown>, apiKey: string) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let json: any = null;

  try {
    json = responseText ? JSON.parse(responseText) : null;
  } catch {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text: responseText,
    json,
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  let body: ChatAiRequestBody;

  try {
    const rawBody = await request.json();
    body = isRecord(rawBody) ? rawBody : { Message: rawBody };
  } catch {
    return jsonResponse(
      request,
      createApiPayload(createServerIssueReply('A mensagem enviada para a IA veio em um formato invalido.'), false),
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      request,
      createApiPayload(createServerIssueReply('A chave da OpenAI ainda nao esta configurada no servidor.'), false),
      { status: 503 },
    );
  }

  const messages = normalizeMessages(body);
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';

  if (!lastUserMessage) {
    return jsonResponse(
      request,
      createApiPayload(createServerIssueReply('Envie uma pergunta para iniciar o chat com IA.'), false),
      { status: 400 },
    );
  }

  if (isClearlyOffTopic(lastUserMessage)) {
    return jsonResponse(request, createApiPayload(createScopeReply()));
  }

  const context = normalizeRequestContext(body);
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const basePayload = {
    model,
    instructions: buildInstructions(context),
    input: buildOpenAiInput(messages),
    text: {
      format: {
        type: 'json_schema',
        name: 'choas_study_chat_response',
        strict: true,
        schema: AI_CHAT_RESPONSE_SCHEMA,
      },
    },
    tools: [{ type: 'web_search' }],
    store: false,
    max_output_tokens: 1300,
  };

  let apiResult = await callOpenAi(basePayload, apiKey);
  if (!apiResult.ok && /web_search|tools?|unsupported/i.test(apiResult.text)) {
    const { tools, ...payloadWithoutTools } = basePayload;
    void tools;
    apiResult = await callOpenAi(payloadWithoutTools, apiKey);
  }

  if (!apiResult.ok) {
    const errorSummary = normalizeText(apiResult.json?.error?.message || apiResult.text, 500);
    return jsonResponse(
      request,
      createApiPayload(createServerIssueReply(errorSummary || 'Nao consegui consultar a OpenAI agora.'), false),
      { status: apiResult.status || 502 },
    );
  }

  const { text, links } = extractOutputText(apiResult.json);
  let parsed: unknown = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  const reply = normalizeReply(parsed, text);
  const seenUrls = new Set(reply.links.map((link) => link.url));
  links.forEach((link) => {
    if (reply.links.length >= 5 || seenUrls.has(link.url)) {
      return;
    }

    reply.links.push(link);
    seenUrls.add(link.url);
  });

  return jsonResponse(request, createApiPayload(reply));
}
