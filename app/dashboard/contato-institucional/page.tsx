'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/useAuth';
import { getUserProfileService, type UserProfile } from '../../../lib/userProfileService';
import { loadConnectionDirectory, type ConnectionDirectoryUser } from '../../../lib/connectionWorkspaceService';
import { Building2, Mail, MessageCircle, Search, Users } from 'lucide-react';

const roleMatchers = ['professor', 'docente', 'orientador', 'coordenador', 'coordinator', 'coordenação', 'coordenacao', 'faculty'];

export default function InstitutionalContactPage() {
  const user = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [directory, setDirectory] = useState<ConnectionDirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profileService = getUserProfileService();
        const loadedProfile = await profileService.getUserProfile(user.uid);
        setProfile(loadedProfile);

        if (loadedProfile?.role !== 'company') {
          router.replace('/dashboard/connections');
          return;
        }

        const users = await loadConnectionDirectory();
        setDirectory(
          users.filter((entry) =>
            roleMatchers.some((matcher) => entry.role.toLowerCase().includes(matcher)) ||
            entry.role.toLowerCase().includes('coord') ||
            entry.role.toLowerCase().includes('professor') ||
            entry.role.toLowerCase().includes('docente'),
          ),
        );
      } catch (error) {
        console.error('Erro ao carregar contatos institucionais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, user]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return directory.filter((entry) => {
      if (!query) {
        return true;
      }

      return (
        entry.name.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.role.toLowerCase().includes(query) ||
        entry.academicDepartment.toLowerCase().includes(query) ||
        entry.academicFocus.toLowerCase().includes(query)
      );
    });
  }, [directory, searchQuery]);

  const contactCounts = useMemo(() => ({
    total: directory.length,
    professors: directory.filter((entry) => entry.role.toLowerCase().includes('professor') || entry.role.toLowerCase().includes('docente')).length,
    coordinators: directory.filter((entry) => entry.role.toLowerCase().includes('coord')).length,
  }), [directory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando contatos institucionais...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'company') {
    return null;
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/20">
              <Building2 size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Área empresarial</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Contato Institucional</h1>
              <p className="mt-2 text-sm text-slate-600">
                Professores, coordenação e canais institucionais da faculdade.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[360px]">
            <StatCard label="Contatos" value={contactCounts.total} />
            <StatCard label="Professores" value={contactCounts.professors} />
            <StatCard label="Coordenação" value={contactCounts.coordinators} />
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nome, cargo, departamento ou foco..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-4 md:grid-cols-2">
          {filteredContacts.length === 0 ? (
            <div className="md:col-span-2 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <Users size={42} className="mx-auto text-slate-400" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">Nenhum contato encontrado</h2>
              <p className="mt-2 text-sm text-slate-600">Ajuste a busca para localizar professores e coordenação.</p>
            </div>
          ) : (
            filteredContacts.map((entry) => (
              <article key={entry.userId} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">{entry.role}</p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">{entry.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{entry.professionalTitle || entry.headline || 'Contato institucional'}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-black text-white ring-1 ring-slate-200">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-900">Email:</span> {entry.email || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Departamento:</span> {entry.academicDepartment || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-900">Foco:</span> {entry.academicFocus || 'Não informado'}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.email ? (
                    <a
                      href={`mailto:${entry.email}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Mail size={16} />
                      Email
                    </a>
                  ) : null}
                  {entry.email ? (
                    <a
                      href="/chat"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <MessageCircle size={16} />
                      Chat
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Contato da empresa</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Responsável:</span> {profile.companyContactName || profile.displayName || 'Não informado'}</p>
              <p><span className="font-semibold text-slate-900">Função:</span> {profile.companyContactRole || 'Não informada'}</p>
              <p><span className="font-semibold text-slate-900">Telefone:</span> {profile.companyPhone || 'Não informado'}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {profile.email || 'Não informado'}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Canais úteis</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• Use o chat para iniciar conversas com alunos e docentes.</p>
              <p>• Priorize professores e coordenação para alinhamentos institucionais.</p>
              <p>• Os contatos listados são carregados diretamente do cadastro do sistema.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-4 text-left shadow-lg shadow-slate-950/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/80">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}