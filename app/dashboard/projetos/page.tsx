'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/useAuth';
import { getUserProfileService, type UserProfile } from '../../../lib/userProfileService';
import {
  buildTeamBalanceLabel,
  buildTeamLeadershipLabel,
  buildTeamProfessorFocusLabel,
  getFacultyTeamMembers,
  getStudentTeamMembers,
  getTeamLogoSource,
  loadAllTeamWorkspaces,
  type TeamWorkspace,
} from '../../../lib/teamWorkspaceService';
import { ArrowRight, Calendar, Filter, FolderSearch, MessageCircle, Search, Users } from 'lucide-react';

const statusOptions = ['all', 'Planejamento', 'Em Andamento', 'Concluído'] as const;

export default function CompanyProjectsPage() {
  const user = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<TeamWorkspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('all');

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
          router.replace('/dashboard/teams');
          return;
        }

        const loadedProjects = await loadAllTeamWorkspaces();
        setProjects(
          loadedProjects.sort((left, right) => {
            const leftDate = new Date(left.updatedAt || left.createdAt).getTime();
            const rightDate = new Date(right.updatedAt || right.createdAt).getTime();
            return rightDate - leftDate;
          }),
        );
      } catch (error) {
        console.error('Erro ao carregar projetos da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, user]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        project.teamName.toLowerCase().includes(query) ||
        project.course.toLowerCase().includes(query) ||
        project.className.toLowerCase().includes(query) ||
        project.focalProfessorName.toLowerCase().includes(query) ||
        project.professorSupervisorNames.join(' ').toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || project.projectStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const recentProjects = useMemo(() => filteredProjects.slice(0, 5), [filteredProjects]);

  const counts = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.projectProgress < 100).length,
    completed: projects.filter((project) => project.projectProgress >= 100).length,
    faculty: projects.reduce((sum, project) => sum + getFacultyTeamMembers(project).length, 0),
  }), [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'company') {
    return null;
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                <FolderSearch size={14} />
                Área empresarial
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Projetos</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/90">
                Pesquise projetos, acompanhe os mais recentes, veja membros, professores e progresso sem editar o conteúdo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricPill label="Projetos" value={counts.total} />
              <MetricPill label="Em andamento" value={counts.active} />
              <MetricPill label="Concluídos" value={counts.completed} />
              <MetricPill label="Docentes" value={counts.faculty} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_240px] xl:p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por projeto, curso, turma ou docente..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Filter size={18} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'Todos os status' : option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <Users size={42} className="mx-auto text-slate-400" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">Nenhum projeto encontrado</h2>
              <p className="mt-2 text-sm text-slate-600">Ajuste os filtros para localizar projetos, turmas ou docentes.</p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const students = getStudentTeamMembers(project);
              const faculty = getFacultyTeamMembers(project);
              const logoSource = getTeamLogoSource(project);
              const deadline = project.projectDeadline ? new Date(project.projectDeadline).toLocaleDateString('pt-BR') : 'Sem prazo';

              return (
                <article key={project.teamId} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                        {logoSource ? (
                          <img src={logoSource} alt={project.teamName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-black text-slate-500">{project.teamName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{project.teamName}</h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{project.projectStatus}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{project.course} • {project.className || 'Turma não informada'}</p>
                        <p className="mt-2 text-sm text-slate-500">{buildTeamProfessorFocusLabel(project)}</p>
                        <p className="mt-1 text-sm text-slate-500">{buildTeamLeadershipLabel(project)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/dashboard/teams/${project.teamId}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Ver projeto
                        <ArrowRight size={16} />
                      </a>
                      <a
                        href="/dashboard/chats"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <MessageCircle size={16} />
                        Conversar
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4 xl:px-6">
                    <InfoTile label="Progresso" value={`${project.projectProgress}%`} helper={buildTeamBalanceLabel(project)} />
                    <InfoTile label="Pessoas" value={`${students.length + faculty.length}`} helper={`${students.length} alunos • ${faculty.length} docentes`} />
                    <InfoTile label="Prazo" value={deadline} helper={project.projectDeadline ? 'Data do projeto' : 'Prazo não definido'} />
                    <InfoTile label="Arquivos" value={project.assets.length.toString()} helper="Materiais anexados ao projeto" />
                  </div>

                  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] xl:px-6">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Membros</p>
                      <div className="flex flex-wrap gap-2">
                        {students.slice(0, 4).map((member) => (
                          <span key={member.userId || member.name} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {member.name}
                          </span>
                        ))}
                        {faculty.slice(0, 4).map((member) => (
                          <span key={member.userId || member.name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {member.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Arquivos e acesso</p>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">{project.assets.length} arquivos</span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">{project.milestones.length} marcos</span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">{project.taskColumns.reduce((sum, column) => sum + column.cards.length, 0)} cards</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Recentes</p>
            <div className="mt-4 space-y-3">
              {recentProjects.map((project) => (
                <a
                  key={project.teamId}
                  href={`/dashboard/teams/${project.teamId}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{project.teamName}</p>
                      <p className="mt-1 text-xs text-slate-500">{project.course}</p>
                    </div>
                    <Calendar size={16} className="text-slate-400" />
                  </div>
                  <p className="mt-3 text-xs text-slate-600">{buildTeamBalanceLabel(project)}</p>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Visão rápida</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• A empresa somente visualiza o conteúdo do projeto.</p>
              <p>• Membros e arquivos ficam visíveis no resumo de cada workspace.</p>
              <p>• Conversas podem ser iniciadas pelo chat da empresa.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}