export type AiChatReplyKind = 'answer' | 'refusal' | 'clarify';

export interface AiChatLink {
  label: string;
  url: string;
  note: string;
}

export interface AiChatCodeBlock {
  language: string;
  title: string;
  code: string;
}

export interface AiChatReply {
  kind: AiChatReplyKind;
  title: string;
  summary: string;
  highlights: string[];
  steps: string[];
  links: AiChatLink[];
  codeBlocks: AiChatCodeBlock[];
  followUp: string;
}

export interface AiChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export const AI_CHAT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'title', 'summary', 'highlights', 'steps', 'links', 'codeBlocks', 'followUp'],
  properties: {
    kind: {
      type: 'string',
      enum: ['answer', 'refusal', 'clarify'],
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 90,
    },
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 900,
    },
    highlights: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 220,
      },
    },
    steps: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 260,
      },
    },
    links: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'url', 'note'],
        properties: {
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 90,
          },
          url: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
          },
          note: {
            type: 'string',
            maxLength: 180,
          },
        },
      },
    },
    codeBlocks: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['language', 'title', 'code'],
        properties: {
          language: {
            type: 'string',
            maxLength: 40,
          },
          title: {
            type: 'string',
            maxLength: 90,
          },
          code: {
            type: 'string',
            maxLength: 2000,
          },
        },
      },
    },
    followUp: {
      type: 'string',
      maxLength: 240,
    },
  },
} as const;

export const AI_CHAT_EMPTY_REPLY: AiChatReply = {
  kind: 'answer',
  title: 'Resposta',
  summary: '',
  highlights: [],
  steps: [],
  links: [],
  codeBlocks: [],
  followUp: '',
};
