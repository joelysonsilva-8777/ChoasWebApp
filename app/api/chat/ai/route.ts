import {
  AI_CHAT_RESPONSE_SCHEMA,
  type AiChatHistoryItem,
  type AiChatLink,
  type AiChatReply,
} from '../../../../lib/aiChatTypes';

export const runtime = 'nodejs';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1';

type RequestContext = {
  userName?: string;
  role?: string;
  projectContext?: string;
};

type ChatAiRequestBody = {
  messages?: AiChatHistoryItem[];
  context?: RequestContext;
};

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
    summary: 'Posso ajudar com estudos, pesquisas, projetos acadêmicos e uso do Choas. Esse assunto foge do contexto da plataforma.',
    highlights: [
      'Traga uma dúvida de projeto, entrega, equipe ou disciplina.',
      'Também posso explicar como usar chats, calendário, conexões, arquivos e equipes.',
    ],
    steps: [],
    links: [],
    followUp: 'Me diga qual projeto, atividade ou funcionalidade você quer destravar agora.',
  };
}

function createServerIssueReply(summary: string): AiChatReply {
  return {
    kind: 'clarify',
    title: 'IA indisponível',
    summary,
    highlights: [],
    steps: [
      'Configure OPENAI_API_KEY nas variáveis de ambiente da Vercel.',
      'Opcionalmente defina OPENAI_MODEL para trocar o modelo usado pela assistente.',
      'Depois do deploy, volte ao chat e envie a pergunta novamente.',
    ],
    links: [],
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

function normalizeReply(value: unknown, fallbackText = ''): AiChatReply {
  const data = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const kind = data.kind === 'refusal' || data.kind === 'clarify' ? data.kind : 'answer';
  const rawLinks = Array.isArray(data.links) ? data.links : [];

  return {
    kind,
    title: stripMarkdownArtifacts(normalizeText(data.title, 90) || 'Resposta'),
    summary: stripMarkdownArtifacts(normalizeText(data.summary, 900) || stripMarkdownArtifacts(fallbackText) || 'Não consegui montar uma resposta completa agora.'),
    highlights: Array.isArray(data.highlights)
      ? data.highlights.map((item) => stripMarkdownArtifacts(normalizeText(item, 220))).filter(Boolean).slice(0, 5)
      : [],
    steps: Array.isArray(data.steps)
      ? data.steps.map((item) => stripMarkdownArtifacts(normalizeText(item, 260))).filter(Boolean).slice(0, 6)
      : [],
    links: rawLinks.map((item) => sanitizeLink(item as Partial<AiChatLink>)).filter((item): item is AiChatLink => Boolean(item)).slice(0, 5),
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

function buildInstructions(context: Required<RequestContext>): string {
  return [
    'Você é Codex IA dentro do Choas, uma plataforma acadêmica para projetos integradores.',
    'Seu trabalho é ajudar com estudos, pesquisas, projetos, equipes, entregas, organização acadêmica e uso das funcionalidades do Choas.',
    'Você pode usar o contexto dos projetos/equipes do usuário para responder perguntas sobre andamento, prazos, marcos, tarefas e próximos passos.',
    'Você também pode explicar funcionalidades do Choas: chats, anexos, figurinhas, conexões, equipes, projetos, calendário, arquivos, perfil, configurações e área empresarial.',
    'Se o pedido for banal ou fora do contexto de estudo/projeto/plataforma, recuse de forma educada e redirecione para um tema acadêmico ou do Choas.',
    'Exemplos fora do escopo: placar de futebol, apostas, fofoca, celebridades, horóscopo e entretenimento casual sem relação com estudo.',
    'Se o usuário pedir pesquisa, referências, dados atuais ou links, use pesquisa web quando necessário e devolva URLs somente no campo links.',
    'Não use markdown, títulos com #, listas com hífen, código cercado ou links no formato markdown. Responda apenas com JSON válido seguindo o schema.',
    'Mantenha a resposta curta, visualmente organizada e pronta para ser renderizada em cards de chat.',
    `Usuário: ${context.userName || 'usuário autenticado'}. Perfil: ${context.role || 'student'}.`,
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

export async function POST(request: Request) {
  let body: ChatAiRequestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ reply: createServerIssueReply('A mensagem enviada para a IA veio em um formato inválido.') }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: createServerIssueReply('A chave da OpenAI ainda não está configurada no servidor.') }, { status: 503 });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((message) => message?.role === 'user' || message?.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: normalizeMultilineText(message.content, 1600),
        }))
        .filter((message) => message.content)
    : [];
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';

  if (!lastUserMessage) {
    return Response.json({ reply: createServerIssueReply('Envie uma pergunta para iniciar o chat com IA.') }, { status: 400 });
  }

  if (isClearlyOffTopic(lastUserMessage)) {
    return Response.json({ reply: createScopeReply() });
  }

  const context: Required<RequestContext> = {
    userName: normalizeText(body.context?.userName, 120) || 'usuário autenticado',
    role: normalizeText(body.context?.role, 80) || 'student',
    projectContext: normalizeMultilineText(body.context?.projectContext, 9000),
  };
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
    return Response.json(
      { reply: createServerIssueReply(errorSummary || 'Não consegui consultar a OpenAI agora.') },
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

  return Response.json({ reply });
}
