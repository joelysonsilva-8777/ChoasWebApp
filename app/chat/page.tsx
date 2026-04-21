'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { ChatServiceTS, ChatMessage, Conversation } from '../../lib/chatService';
import AvatarDisplay from '../../components/AvatarDisplay';
import { DEFAULT_AVATAR } from '../../lib/avatarService';
import { STICKER_ASSETS, resolveStickerAssetSource } from '../../lib/chatMedia';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Video,
  Info,
  MoreVertical,
  Paperclip,
  Send,
  Search,
  Plus,
  Filter,
  Loader,
  X,
  FileText,
  Smile,
} from 'lucide-react';

type PendingAttachment = {
  file: File;
  previewSource: string;
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const formatTimestamp = (date: Date): string => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getConversationContactId = (conversation: Conversation, currentUserId?: string): string => {
  return conversation.userAId === currentUserId ? conversation.userBId : conversation.userAId;
};

const getConversationContactName = (conversation: Conversation, currentUserId?: string): string => {
  return conversation.userAId === currentUserId ? conversation.userBName : conversation.userAName;
};

const getConversationContactAvatar = (conversation: Conversation, currentUserId?: string) => {
  return conversation.userAId === currentUserId ? conversation.userBAvatar : conversation.userAAvatar;
};

const getConversationContactPhotoSource = (conversation: Conversation, currentUserId?: string): string => {
  return conversation.userAId === currentUserId
    ? conversation.userBProfilePhotoSource || conversation.userBProfilePhotoDataUri || ''
    : conversation.userAProfilePhotoSource || conversation.userAProfilePhotoDataUri || '';
};

export default function ChatPage() {
  const user = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatService, setChatService] = useState<ChatServiceTS | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const selectedConversationContactName = useMemo(() => {
    if (!selectedConversation || !user) {
      return '';
    }

    return getConversationContactName(selectedConversation, user.uid);
  }, [selectedConversation, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      try {
        setLoadingConversations(true);
        const service = new ChatServiceTS(user.uid, user.uid);
        setChatService(service);

        const loadedConversations = await service.loadConversationsAsync();
        setConversations(loadedConversations);
        setLoadingConversations(false);

        if (loadedConversations.length > 0) {
          const initialConversation = loadedConversations[0];
          setSelectedConversation(initialConversation);
          void loadConversationMessages(initialConversation, service);
        }
      } catch (error) {
        console.error('Erro ao carregar chat:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const loadConversationMessages = async (conversation: Conversation, serviceOverride?: ChatServiceTS) => {
    if (!user) {
      return;
    }

    const service = serviceOverride || chatService;
    if (!service) {
      return;
    }

    try {
      setLoadingMessages(true);
      const contactId = getConversationContactId(conversation, user.uid);
      const loadedMessages = await service.loadMessagesAsync(contactId, 80);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMobileView('chat');
    setMessages([]);
    await loadConversationMessages(conversation);
  };

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        const previewSource = file.type.startsWith('image/') ? await fileToDataUrl(file) : '';
        return { file, previewSource };
      }),
    );

    setPendingAttachments((previous) => [...previous, ...attachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const syncConversations = async (service: ChatServiceTS) => {
    const refreshedConversations = await service.loadConversationsAsync();
    setConversations(refreshedConversations);

    if (selectedConversation) {
      const refreshedSelected = refreshedConversations.find(
        (conversation) => conversation.conversationId === selectedConversation.conversationId,
      );

      if (refreshedSelected) {
        setSelectedConversation(refreshedSelected);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user || !chatService || !selectedConversation) {
      return;
    }

    const trimmedMessage = messageInput.trim();
    const hasAttachments = pendingAttachments.length > 0;

    if (!trimmedMessage && !hasAttachments) {
      return;
    }

    try {
      setSending(true);
      const contactId = getConversationContactId(selectedConversation, user.uid);
      const contactName = getConversationContactName(selectedConversation, user.uid);
      const senderName = user.displayName || 'Usuário';

      if (hasAttachments) {
        const caption = pendingAttachments.length === 1 ? trimmedMessage : '';

        for (const [index, attachment] of pendingAttachments.entries()) {
          const result = await chatService.sendAttachmentMessageAsync(
            contactId,
            contactName,
            senderName,
            attachment.file,
            index === 0 ? caption : '',
            attachment.previewSource,
          );

          if (!result.success) {
            throw new Error(result.error || 'Falha ao enviar anexo');
          }

          if (result.message) {
            setMessages((previous) => [...previous, result.message as ChatMessage]);
          }
        }
      } else {
        const result = await chatService.sendMessageAsync(contactId, contactName, senderName, trimmedMessage, 'text');

        if (!result.success) {
          throw new Error(result.error || 'Falha ao enviar mensagem');
        }

        const newMessage: ChatMessage = {
          messageId: `msg_${Date.now()}`,
          documentId: `doc_${Date.now()}`,
          senderId: user.uid,
          senderName,
          content: trimmedMessage,
          messageType: 'text',
          timestamp: new Date(),
          isOwn: true,
        };

        setMessages((previous) => [...previous, newMessage]);
      }

      setMessageInput('');
      setPendingAttachments([]);
      await syncConversations(chatService);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const contactName = getConversationContactName(conversation, user?.uid);
      return contactName.toLowerCase().includes(searchInput.toLowerCase());
    });
  }, [conversations, searchInput, user?.uid]);

  const renderMessageAttachment = (message: ChatMessage) => {
    const resolvedImageSource = message.attachmentPreviewSource || message.attachmentPreviewDataUri || '';
    const attachmentName = message.attachmentFileName || 'anexo';

    if (message.messageType === 'image' && resolvedImageSource) {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20">
          <img
            src={resolvedImageSource}
            alt={attachmentName}
            className="max-h-80 w-full object-cover"
            loading="lazy"
          />
          {message.content && (
            <div className="px-4 py-3 text-sm leading-relaxed">
              {message.content}
            </div>
          )}
        </div>
      );
    }

    if (message.attachmentFileName) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
            <FileText size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{attachmentName}</p>
            <p className="text-xs text-slate-300">
              {message.attachmentContentType || 'Arquivo'}
              {message.attachmentSizeBytes ? ` • ${(message.attachmentSizeBytes / 1024).toFixed(1)} KB` : ''}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderMessageSticker = (message: ChatMessage) => {
    const stickerSource = message.stickerSource || resolveStickerAssetSource(message.stickerAsset);

    if (!stickerSource) {
      return null;
    }

    return (
      <div className="max-w-[14rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20 p-2">
        <img
          src={stickerSource}
          alt={message.stickerAsset || 'Figurinha'}
          className="h-36 w-36 object-contain"
          loading="lazy"
        />
      </div>
    );
  };

  const pendingCaption = pendingAttachments.length > 0 ? `${pendingAttachments.length} arquivo(s) prontos` : 'Sem anexos';
  const isMobileChatView = mobileView === 'chat';

  if (loadingConversations && conversations.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <Loader className="mx-auto mb-4 animate-spin text-blue-400" size={48} />
          <p className="text-slate-300">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_24%)] lg:flex-row">
        <aside
          className={`${isMobileChatView ? 'hidden lg:flex' : 'flex'} min-h-0 w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/70 backdrop-blur-xl lg:w-[390px] lg:border-b-0 lg:border-r xl:w-[420px]`}
        >
          <div className="border-b border-white/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Conversas</h2>
              <div className="flex gap-2">
                <button className="rounded-xl p-2 text-blue-300 transition hover:bg-white/10 hover:text-white">
                  <Plus size={18} />
                </button>
                <button className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar conversas..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-300 sm:px-5">
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-200">Favoritos</span>
            <span className="rounded-full bg-white/5 px-3 py-1">Chats</span>
            <span className="ml-auto hidden text-slate-400 sm:inline">Atualizado em tempo real</span>
          </div>

          <div className="max-h-[40vh] flex-1 overflow-y-auto lg:max-h-none">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <MessageCircle size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const contactName = getConversationContactName(conversation, user.uid);
                const contactAvatar = getConversationContactAvatar(conversation, user.uid) || DEFAULT_AVATAR;
                const contactPhotoSource = getConversationContactPhotoSource(conversation, user.uid);

                return (
                  <button
                    key={conversation.conversationId}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full border-b border-white/5 px-4 py-4 text-left transition hover:bg-white/5 ${
                      selectedConversation?.conversationId === conversation.conversationId ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <AvatarDisplay
                          avatar={contactAvatar}
                          imageSrc={contactPhotoSource}
                          size="sm"
                          fallback={contactName.charAt(0).toUpperCase()}
                        />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{contactName}</p>
                          <span className="shrink-0 text-xs text-slate-400">
                            {conversation.lastMessageTime ? formatTimestamp(conversation.lastMessageTime) : ''}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-300">{conversation.lastMessage}</p>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full bg-white/5 px-2 py-0.5">{conversation.lastMessageType || 'text'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`${isMobileChatView ? 'flex' : 'hidden lg:flex'} min-h-0 flex-1 flex-col overflow-hidden bg-slate-950/50 backdrop-blur-xl`}
        >
          {selectedConversation ? (
            <>
              <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
                    aria-label="Voltar para conversas"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="relative">
                    <AvatarDisplay
                      avatar={getConversationContactAvatar(selectedConversation, user.uid) || DEFAULT_AVATAR}
                      imageSrc={getConversationContactPhotoSource(selectedConversation, user.uid)}
                      size="sm"
                      fallback={selectedConversationContactName.charAt(0).toUpperCase()}
                    />
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedConversationContactName}</p>
                    <p className="text-xs text-emerald-400">Online</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end text-blue-200 sm:self-auto">
                  <button className="rounded-xl p-2 transition hover:bg-white/10 hover:text-white">
                    <Phone size={18} />
                  </button>
                  <button className="rounded-xl p-2 transition hover:bg-white/10 hover:text-white">
                    <Video size={18} />
                  </button>
                  <button className="rounded-xl p-2 transition hover:bg-white/10 hover:text-white">
                    <Info size={18} />
                  </button>
                  <button className="rounded-xl p-2 transition hover:bg-white/10 hover:text-white">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 lg:px-8">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Loader className="mx-auto mb-4 animate-spin text-cyan-300" size={40} />
                      <p className="text-slate-300">Carregando mensagens...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <MessageCircle size={56} className="mx-auto mb-4 text-slate-500" />
                      <p className="text-lg text-slate-200">Nenhuma mensagem ainda. Comece a conversa.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const senderPhotoSource = message.senderProfilePhotoSource || message.senderProfilePhotoDataUri || '';
                      const isOwn = message.isOwn;
                      const messageAvatar = message.senderAvatar || DEFAULT_AVATAR;

                      return (
                        <div key={message.documentId} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-3`}>
                          {!isOwn && (
                            <AvatarDisplay
                              avatar={messageAvatar}
                              imageSrc={senderPhotoSource}
                              size="sm"
                              fallback={message.senderName?.charAt(0).toUpperCase() || '?'}
                            />
                          )}

                          <div
                            className={`max-w-[min(34rem,86%)] rounded-3xl px-4 py-3 shadow-lg sm:max-w-[min(34rem,80%)] ${
                              isOwn
                                ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                : 'rounded-bl-md border border-white/10 bg-white/5 text-white backdrop-blur'
                            }`}
                          >
                            {message.messageType === 'image' || message.attachmentFileName ? renderMessageAttachment(message) : null}

                            {message.messageType === 'sticker' || message.stickerAsset ? renderMessageSticker(message) : null}

                            {message.content && message.messageType !== 'image' && message.messageType !== 'sticker' && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            )}

                            <div className={`mt-2 text-xs ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                              {formatTimestamp(message.timestamp)}
                            </div>
                          </div>

                          {isOwn && (
                            <AvatarDisplay
                              avatar={messageAvatar}
                              imageSrc={senderPhotoSource}
                              size="sm"
                              fallback={message.senderName?.charAt(0).toUpperCase() || '?'}
                            />
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-5">
                {pendingAttachments.length > 0 && (
                  <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Anexos prontos para envio</p>
                      <p className="text-xs text-slate-400">{pendingCaption}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {pendingAttachments.map((attachment, index) => (
                        <div key={`${attachment.file.name}-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(index)}
                            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition hover:bg-black/70"
                          >
                            <X size={14} />
                          </button>

                          {attachment.previewSource ? (
                            <img src={attachment.previewSource} alt={attachment.file.name} className="mb-3 h-28 w-full rounded-xl object-cover" />
                          ) : (
                            <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                              <FileText size={28} />
                            </div>
                          )}

                          <p className="truncate text-sm font-semibold text-white">{attachment.file.name}</p>
                          <p className="text-xs text-slate-400">{(attachment.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showStickerPicker && (
                  <div className="mb-4 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/30">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Figurinhas</p>
                        <p className="text-xs text-slate-400">Mesma lógica do desktop, usando a pasta public/img/emojiobsseract</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowStickerPicker(false)}
                        className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="grid max-h-64 grid-cols-4 gap-3 overflow-y-auto pr-1 sm:grid-cols-5 lg:grid-cols-7">
                      {STICKER_ASSETS.map((stickerAsset) => (
                        <button
                          key={stickerAsset}
                          type="button"
                          onClick={async () => {
                            if (!user || !chatService || !selectedConversation) {
                              return;
                            }

                            try {
                              setSending(true);
                              const contactId = getConversationContactId(selectedConversation, user.uid);
                              const contactName = getConversationContactName(selectedConversation, user.uid);
                              const senderName = user.displayName || 'Usuário';
                              const result = await chatService.sendStickerMessageAsync(contactId, contactName, senderName, stickerAsset);

                              if (result.success) {
                                if (result.message) {
                                  setMessages((previous) => [...previous, result.message as ChatMessage]);
                                }

                                await syncConversations(chatService);
                                setShowStickerPicker(false);
                              }
                            } catch (error) {
                              console.error('Erro ao enviar figurinha:', error);
                            } finally {
                              setSending(false);
                            }
                          }}
                          className="group rounded-2xl border border-white/10 bg-white/5 p-2 transition hover:border-cyan-400/60 hover:bg-cyan-400/10"
                        >
                          <img
                            src={resolveStickerAssetSource(stickerAsset)}
                            alt={stickerAsset}
                            className="h-20 w-full object-contain transition group-hover:scale-105"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/10 sm:flex-row sm:items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    multiple
                    onChange={handleAttachmentSelection}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 rounded-2xl p-3 text-cyan-300 transition hover:bg-white/10 hover:text-white"
                      title="Anexar arquivo"
                    >
                      <Paperclip size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStickerPicker((previous) => !previous)}
                      className="shrink-0 rounded-2xl p-3 text-cyan-300 transition hover:bg-white/10 hover:text-white"
                      title="Figurinhas"
                    >
                      <Smile size={18} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                    <input
                      type="text"
                      placeholder="Escreva uma mensagem ou legenda..."
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={sending}
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={sending || (!messageInput.trim() && pendingAttachments.length === 0)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto mb-4 text-slate-500" />
                <p className="text-lg text-slate-200">Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
