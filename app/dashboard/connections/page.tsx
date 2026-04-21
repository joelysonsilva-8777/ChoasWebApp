'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/useAuth';
import AvatarDisplay from '../../../components/AvatarDisplay';
import { DEFAULT_AVATAR } from '../../../lib/avatarService';
import { getUserProfileService, type UserProfile } from '../../../lib/userProfileService';
import {
  acceptConnectionRequest,
  buildConnectionStatusLabel,
  declineConnectionRequest,
  loadConnectionDirectory,
  loadConnectionsSummary,
  markConnectionAsRead,
  sendConnectionRequest,
  type ConnectionDirectoryUser,
  type ConnectionEntry,
} from '../../../lib/connectionWorkspaceService';
import { ArrowRight, BellRing, CheckCircle2, MessageCircle, Search, UserPlus, Users, XCircle } from 'lucide-react';

export default function ConnectionsPage() {
  const user = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<ConnectionEntry[]>([]);
  const [directory, setDirectory] = useState<ConnectionDirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const reloadData = async () => {
    if (!user) {
      return;
    }

    const profileService = getUserProfileService();
    const [profile, summary, users] = await Promise.all([
      profileService.getUserProfile(user.uid),
      loadConnectionsSummary(user.uid),
      loadConnectionDirectory(),
    ]);

    setCurrentProfile(profile);
    setEntries(summary.entries);
    setDirectory(users.filter((item) => item.userId !== user.uid));
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadPage = async () => {
      try {
        await reloadData();
      } catch (error) {
        console.error('Erro ao carregar conexões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [user]);

  const summary = useMemo(() => {
    const incoming = entries.filter((entry) => entry.status === 'pendingIncoming');
    const outgoing = entries.filter((entry) => entry.status === 'pendingOutgoing');
    const active = entries.filter((entry) => entry.status === 'connected');
    const notifications = entries.filter((entry) => Boolean(entry.notificationType) && !entry.isRead);
    return { incoming, outgoing, active, notifications };
  }, [entries]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return directory.slice(0, 12);
    }

    return directory.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query) ||
      item.course.toLowerCase().includes(query) ||
      item.registration.toLowerCase().includes(query) ||
      item.academicDepartment.toLowerCase().includes(query) ||
      item.academicFocus.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query)
    );
  }, [directory, searchQuery]);

  const connectionLookup = useMemo(() => {
    const byUserId = new Map<string, ConnectionEntry>();
    entries.forEach((entry) => {
      byUserId.set(entry.connectedUserId, entry);
    });
    return byUserId;
  }, [entries]);

  const handleSendConnection = async (targetUser: ConnectionDirectoryUser) => {
    if (!currentProfile) {
      return;
    }

    setSaving(true);
    try {
      await sendConnectionRequest(currentProfile, targetUser);
      await reloadData();
    } catch (error) {
      console.error('Erro ao enviar conexão:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (request: ConnectionEntry) => {
    if (!currentProfile) {
      return;
    }

    setSaving(true);
    try {
      await acceptConnectionRequest(currentProfile, request);
      await reloadData();
    } catch (error) {
      console.error('Erro ao aceitar conexão:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async (request: ConnectionEntry) => {
    if (!currentProfile) {
      return;
    }

    setSaving(true);
    try {
      await declineConnectionRequest(currentProfile, request);
      await reloadData();
    } catch (error) {
      console.error('Erro ao recusar conexão:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenProfile = async (request: ConnectionEntry) => {
    if (!user) {
      return;
    }

    await markConnectionAsRead(user.uid, request);
    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <AvatarDisplay
              avatar={currentProfile?.avatar || DEFAULT_AVATAR}
              imageSrc={currentProfile?.profilePhotoSource || ''}
              size="lg"
              fallback={currentProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Rede social acadêmica</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Conexões</h1>
              <p className="mt-2 text-sm text-slate-600">Convites, aceites, notificações e busca de usuários como no aplicativo desktop.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <StatPill label="Ativas" value={summary.active.length} />
            <StatPill label="Pendentes" value={summary.incoming.length} />
            <StatPill label="Enviadas" value={summary.outgoing.length} />
            <StatPill label="Avisos" value={summary.notifications.length} />
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nome, email, curso, matrícula ou setor..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Solicitações recebidas" icon={UserPlus} subtitle="Resposta pendente no desktop também aparece aqui.">
          <ConnectionList
            emptyText="Nenhuma solicitação para responder agora."
            entries={summary.incoming}
            actions={(entry) => (
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={saving}
                  onClick={() => handleAccept(entry)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  Aceitar
                </button>
                <button
                  disabled={saving}
                  onClick={() => handleDecline(entry)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Recusar
                </button>
                <button
                  onClick={() => handleOpenProfile(entry)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <ArrowRight size={16} />
                  Perfil
                </button>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Convites enviados" icon={MessageCircle} subtitle="Aguarde a resposta do outro lado.">
          <ConnectionList
            emptyText="Nenhum convite enviado pendente."
            entries={summary.outgoing}
            actions={(entry) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenProfile(entry)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowRight size={16} />
                  Perfil
                </button>
                <span className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                  <BellRing size={16} />
                  {buildConnectionStatusLabel(entry)}
                </span>
              </div>
            )}
          />
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <SectionCard title="Conexões ativas" icon={Users} subtitle="Perfis com relacionamento aceito.">
          <ConnectionList
            emptyText="Nenhuma conexão ativa ainda."
            entries={summary.active}
            actions={(entry) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenProfile(entry)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowRight size={16} />
                  Perfil
                </button>
                <button
                  onClick={() => router.push('/chat')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <MessageCircle size={16} />
                  Conversar
                </button>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Notificações" icon={BellRing} subtitle="Atualizações recentes da sua rede.">
          <div className="space-y-3">
            {summary.notifications.length === 0 ? (
              <EmptyState message="Sem notificações novas." />
            ) : (
              summary.notifications.map((entry) => (
                <div key={`${entry.connectionId}-${entry.updatedAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{entry.notificationMessage || buildConnectionStatusLabel(entry)}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.connectedUserName} • {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Buscar pessoas" icon={Search} subtitle="Busque usuários do diretório para criar novas conexões.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {searchResults.length === 0 ? (
            <EmptyState message="Nenhum usuário encontrado com esse filtro." />
          ) : (
            searchResults.map((item) => {
              const existingConnection = connectionLookup.get(item.userId);
              const status = existingConnection ? buildConnectionStatusLabel(existingConnection) : 'Disponível';

              return (
                <div key={item.userId} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AvatarDisplay
                      avatar={item.avatar}
                      imageSrc={item.profilePhotoSource}
                      size="sm"
                      fallback={item.name.charAt(0).toUpperCase()}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="truncate text-xs text-slate-500">{item.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.course || item.professionalTitle || 'Usuário do diretório'}</p>
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push('/profile')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Perfil
                    </button>
                    {!existingConnection && (
                      <button
                        disabled={saving}
                        onClick={() => handleSendConnection(item)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <UserPlus size={16} />
                        Conectar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ConnectionList({
  entries,
  emptyText,
  actions,
}: {
  entries: ConnectionEntry[];
  emptyText: string;
  actions: (entry: ConnectionEntry) => React.ReactNode;
}) {
  if (entries.length === 0) {
    return <EmptyState message={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={`${entry.connectionId}-${entry.userId}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">{entry.connectedUserName}</p>
              <p className="mt-1 text-xs text-slate-500">{entry.connectedUserEmail}</p>
              <p className="mt-2 text-xs text-slate-500">{entry.notificationMessage || buildConnectionStatusLabel(entry)}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">{buildConnectionStatusLabel(entry)}</span>
          </div>

          <div className="mt-4">{actions(entry)}</div>
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">{message}</div>;
}
