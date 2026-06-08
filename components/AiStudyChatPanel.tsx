'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Loader,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  AI_CHAT_EMPTY_REPLY,
  type AiChatHistoryItem,
  type AiChatReply,
} from '../lib/aiChatTypes';
import { buildAiStudyContextSummary, type AiStudyContextSummary } from '../lib/aiStudyContext';
import { loadAllTeamWorkspaces, loadUserTeamWorkspaces, type TeamWorkspace } from '../lib/teamWorkspaceService';
import { getUserProfileService, type UserProfile } from '../lib/userProfileService';

const AI_AVATAR_SRC = '/img/ChoasICO.png';

type VisibleAiMessage = {
  id: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  content?: string;
  reply?: AiChatReply;
  status?: 'loading';
  source?: 'welcome' | 'api';
};

type AiStudyChatPanelProps = {
  userId: string;
  displayName: string;
  showBackButton: boolean;
  onBackToList: () => void;
};

const welcomeReply: AiChatReply = {
  kind: 'answer',
  title: 'Codex / OpenAI',
  summary: 'Posso ajudar com pesquisas, projetos em andamento e dúvidas sobre o Choas mantendo o foco no estudo.',
  highlights: [
    'Leio um resumo dos projetos e equipes visíveis para você.',
    'Organizo respostas em blocos claros, sem markdown bruto.',
    'Recuso assuntos banais fora do contexto acadêmico.',
  ],
  steps: [],
  links: [],
  codeBlocks: [],
  followUp: 'Traga uma dúvida de estudo, uma pesquisa ou algo sobre seus projetos.',
};

const quickPrompts = [
  {
    label: 'Meus projetos',
    text: 'Resuma meus projetos atuais e destaque os pontos que merecem atenção.',
    icon: BookOpen,
  },
  {
    label: 'Usar o Choas',
    text: 'Explique como eu posso usar o Choas para organizar uma entrega de projeto.',
    icon: ShieldCheck,
  },
  {
    label: 'Pesquisa',
    text: 'Pesquise um tema acadêmico e organize fontes confiáveis para eu estudar.',
    icon: Search,
  },
] as const;

function createMessageId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeReply(value: unknown): AiChatReply {
  if (!value || typeof value !== 'object') {
    return {
      ...AI_CHAT_EMPTY_REPLY,
      kind: 'clarify',
      title: 'Resposta indisponível',
      summary: 'Não consegui ler a resposta da IA agora.',
      followUp: 'Tente enviar novamente em alguns segundos.',
    };
  }

  const data = value as Partial<AiChatReply>;
  const kind = data.kind === 'refusal' || data.kind === 'clarify' ? data.kind : 'answer';

  return {
    kind,
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Resposta',
    summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : 'Não consegui montar uma resposta completa agora.',
    highlights: Array.isArray(data.highlights) ? data.highlights.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 5) : [],
    steps: Array.isArray(data.steps) ? data.steps.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 6) : [],
    links: Array.isArray(data.links)
      ? data.links
          .filter((item) => item && typeof item.label === 'string' && typeof item.url === 'string')
          .map((item) => ({
            label: item.label,
            url: item.url,
            note: typeof item.note === 'string' ? item.note : '',
          }))
          .slice(0, 5)
      : [],
    codeBlocks: Array.isArray(data.codeBlocks)
      ? data.codeBlocks
          .filter((item) => item && typeof item.code === 'string' && Boolean(item.code.trim()))
          .map((item) => ({
            language: typeof item.language === 'string' ? item.language : '',
            title: typeof item.title === 'string' ? item.title : 'Código',
            code: item.code,
          }))
          .slice(0, 3)
      : [],
    followUp: typeof data.followUp === 'string' ? data.followUp : '',
  };
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUrlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function buildHistory(messages: VisibleAiMessage[], nextUserMessage: VisibleAiMessage): AiChatHistoryItem[] {
  return [...messages, nextUserMessage]
    .filter((message) => message.source !== 'welcome' && message.status !== 'loading')
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.role === 'user'
        ? message.content || ''
        : [
            message.reply?.title,
            message.reply?.summary,
            ...(message.reply?.highlights || []),
            ...(message.reply?.steps || []),
            message.reply?.followUp,
          ].filter(Boolean).join(' '),
    }))
    .filter((message) => message.content.trim());
}

function AiProfilePhoto({ size }: { size: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 rounded-2xl p-1' : 'h-12 w-12 rounded-2xl p-1.5';

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-slate-950 shadow-lg shadow-cyan-950/25 ring-1 ring-cyan-100/60 ${sizeClass}`}>
      <img src={AI_AVATAR_SRC} alt="Choas IA" className="h-full w-full object-contain" />
    </span>
  );
}

export default function AiStudyChatPanel({
  userId,
  displayName,
  showBackButton,
  onBackToList,
}: AiStudyChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<VisibleAiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: new Date(),
      reply: welcomeReply,
      source: 'welcome',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextSummary, setContextSummary] = useState<AiStudyContextSummary | null>(null);
  const [contextError, setContextError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      if (!userId) {
        return;
      }

      setLoadingContext(true);
      setContextError('');

      try {
        const profileService = getUserProfileService();
        const profile = await profileService.getUserProfile(userId);
        const role = profile?.role || 'student';
        const projects: TeamWorkspace[] = role === 'company'
          ? await loadAllTeamWorkspaces()
          : await loadUserTeamWorkspaces(userId);

        if (cancelled) {
          return;
        }

        setContextSummary(buildAiStudyContextSummary(profile as UserProfile | null, displayName, projects));
      } catch (error) {
        console.error('Erro ao carregar contexto da IA:', error);
        if (!cancelled) {
          setContextError('Não foi possível carregar os projetos agora.');
          setContextSummary(buildAiStudyContextSummary(null, displayName, []));
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [displayName, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const hasUserMessages = useMemo(() => messages.some((message) => message.role === 'user'), [messages]);

  const contextBadge = useMemo(() => {
    if (loadingContext) {
      return 'carregando contexto';
    }

    if (!contextSummary) {
      return 'sem contexto';
    }

    const label = contextSummary.projectCount === 1 ? 'projeto' : 'projetos';
    return `${contextSummary.projectCount} ${label}`;
  }, [contextSummary, loadingContext]);

  const sendMessage = async (messageText?: string) => {
    const trimmedMessage = (messageText ?? input).trim();
    if (!trimmedMessage || sending) {
      return;
    }

    const userMessage: VisibleAiMessage = {
      id: createMessageId('user'),
      role: 'user',
      timestamp: new Date(),
      content: trimmedMessage,
      source: 'api',
    };
    const loadingMessageId = createMessageId('assistant_loading');
    const loadingMessage: VisibleAiMessage = {
      id: loadingMessageId,
      role: 'assistant',
      timestamp: new Date(),
      status: 'loading',
      source: 'api',
    };
    const history = buildHistory(messages, userMessage);

    setMessages((previous) => [...previous, userMessage, loadingMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: history,
          context: {
            userName: contextSummary?.displayName || displayName,
            role: contextSummary?.role || 'student',
            projectContext: contextSummary?.promptContext || '',
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      const reply = normalizeReply(payload?.reply || payload);

      setMessages((previous) => previous.map((message) => (
        message.id === loadingMessageId
          ? {
              id: createMessageId('assistant'),
              role: 'assistant',
              timestamp: new Date(),
              reply,
              source: 'api',
            }
          : message
      )));
    } catch (error) {
      console.error('Erro ao enviar mensagem para IA:', error);
      setMessages((previous) => previous.map((message) => (
        message.id === loadingMessageId
          ? {
              id: createMessageId('assistant_error'),
              role: 'assistant',
              timestamp: new Date(),
              reply: {
                ...AI_CHAT_EMPTY_REPLY,
                kind: 'clarify',
                title: 'Conexão indisponível',
                summary: 'Não consegui chamar a IA agora. Verifique a configuração da OpenAI e tente novamente.',
                steps: [
                  'Confirme OPENAI_API_KEY nas variáveis da Vercel.',
                  'Confira se o deploy mais recente já foi publicado.',
                ],
                followUp: 'Quando a API estiver pronta, envie a pergunta de novo.',
              },
              source: 'api',
            }
          : message
      )));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        timestamp: new Date(),
        reply: welcomeReply,
        source: 'welcome',
      },
    ]);
    setInput('');
  };

  const renderAssistantReply = (reply: AiChatReply) => {
    const isRefusal = reply.kind === 'refusal';
    const isClarify = reply.kind === 'clarify';
    const accentClass = isRefusal
      ? 'border-amber-300/30 bg-amber-400/10'
      : isClarify
        ? 'border-cyan-300/30 bg-cyan-400/10'
        : 'border-white/10 bg-white/6';

    return (
      <div className={`w-full rounded-3xl border p-4 text-slate-100 shadow-lg shadow-black/15 backdrop-blur ${accentClass}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AiProfilePhoto size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 break-words text-sm font-bold text-white">{reply.title}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                {reply.kind === 'answer' ? 'estudo' : reply.kind === 'refusal' ? 'fora do escopo' : 'ajuste'}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{reply.summary}</p>
          </div>
        </div>

        {reply.highlights.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {reply.highlights.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm leading-5 text-slate-200">
                {item}
              </div>
            ))}
          </div>
        )}

        {reply.steps.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            {reply.steps.map((step, index) => (
              <div key={`${step}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-200">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-bold text-cyan-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words">{step}</span>
              </div>
            ))}
          </div>
        )}

        {reply.links.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            {reply.links.map((link) => (
              <a
                key={`${link.url}-${link.label}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-3 text-left transition hover:border-cyan-300/60 hover:bg-cyan-300/10"
              >
                <ExternalLink size={16} className="mt-0.5 shrink-0 text-cyan-200 transition group-hover:text-white" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-white">{link.label}</span>
                  {link.note ? <span className="mt-1 block break-words text-xs text-slate-300">{link.note}</span> : null}
                  <span className="mt-1 block truncate text-[11px] text-cyan-200/80">{getUrlHost(link.url)}</span>
                </span>
              </a>
            ))}
          </div>
        )}

        {reply.codeBlocks.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {reply.codeBlocks.map((block, index) => (
              <div key={`${block.title}-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
                  <span className="truncate text-xs font-semibold text-slate-200">{block.title || 'Código'}</span>
                  {block.language ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-cyan-100">{block.language}</span> : null}
                </div>
                <pre className="max-h-72 overflow-auto px-4 py-3 text-xs leading-5 text-slate-100">
                  <code>{block.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {reply.followUp && (
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-sm leading-5 text-emerald-50">
            {reply.followUp}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-slate-950/50">
      <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          {showBackButton && (
            <button
              type="button"
              onClick={onBackToList}
              className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Voltar para conversas"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <AiProfilePhoto size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-white">Codex IA</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">OpenAI</span>
            </div>
              <p className="truncate text-xs text-slate-300">Projetos, pesquisas e uso do Choas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
            {loadingContext ? <Loader size={13} className="animate-spin text-cyan-200" /> : <Sparkles size={13} className="text-cyan-200" />}
            {contextBadge}
          </span>
          <button
            type="button"
            onClick={resetChat}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Limpar chat"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          {messages.map((message) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[min(34rem,86%)] rounded-3xl rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-lg sm:max-w-[min(34rem,80%)]">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                    <p className="mt-2 text-xs text-blue-100">{formatTimestamp(message.timestamp)}</p>
                  </div>
                </div>
              );
            }

            if (message.status === 'loading') {
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[min(34rem,86%)] rounded-3xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-3 text-slate-100 shadow-lg sm:max-w-[min(34rem,80%)]">
                    <div className="flex items-center gap-3">
                      <Loader size={18} className="animate-spin text-cyan-200" />
                      <span className="text-sm text-slate-200">Analisando contexto...</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[min(44rem,96%)] sm:max-w-[min(46rem,92%)]">
                  {message.reply ? renderAssistantReply(message.reply) : null}
                  <p className="mt-2 px-1 text-xs text-slate-500">{formatTimestamp(message.timestamp)}</p>
                </div>
              </div>
            );
          })}

          {!hasUserMessages && (
            <div className="flex flex-wrap gap-2 pl-0 sm:pl-12">
              {quickPrompts.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.label}
                    type="button"
                    onClick={() => setInput(prompt.text)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:text-white"
                  >
                    <Icon size={14} />
                    {prompt.label}
                  </button>
                );
              })}
            </div>
          )}

          {contextError && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
              {contextError}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/10 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={2}
              maxLength={1800}
              placeholder="Pergunte sobre estudo, pesquisa, projetos ou o Choas..."
              className="max-h-32 min-h-[3rem] w-full resize-none bg-transparent text-sm leading-6 text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-emerald-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
