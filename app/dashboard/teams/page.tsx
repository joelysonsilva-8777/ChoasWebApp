'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/useAuth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import AvatarDisplay from '../../../components/AvatarDisplay';
import {
  buildTeamBalanceLabel,
  buildTeamProfessorFocusLabel,
  createDefaultBoardColumns,
  getFacultyTeamMembers,
  getStudentTeamMembers,
  getTeamLogoSource,
  loadUserTeamWorkspaces,
  type TeamWorkspace,
} from '../../../lib/teamWorkspaceService';
import { ArrowRight, Calendar, FolderKanban, Plus, Search, Sparkles, Users } from 'lucide-react';

export default function TeamsPage() {
  const user = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWorkspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    teamName: '',
    course: '',
    className: '',
  });

  useEffect(() => {
    if (!user) return;

    const loadTeams = async () => {
      try {
        setTeams(await loadUserTeamWorkspaces(user.uid));
      } catch (error) {
        console.error('Erro ao carregar equipes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [user]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamData.teamName.trim()) return;

    try {
      const db = getFirestore();
      const teamId = `${user.uid}_${Date.now()}`;
      const now = new Date().toISOString();
      
      // Criar documento da equipe
      await addDoc(collection(db, 'teams'), {
        teamId,
        teamName: newTeamData.teamName,
        course: newTeamData.course,
        className: newTeamData.className,
        classId: '',
        academicTerm: '',
        templateId: '',
        templateName: '',
        projectProgress: 0,
        projectStatus: 'Planejamento',
        projectDeadline: '',
        teacherNotes: '',
        focalProfessorUserId: '',
        focalProfessorName: '',
        professorSupervisorUserIds: [],
        professorSupervisorNames: [],
        defaultFilePermissionScope: 'team',
        members: [{ userId: user.uid, name: user.displayName || 'Usuário', email: user.email || '', role: 'student' }],
        ucs: [],
        semesterTimeline: [],
        milestones: [],
        assets: [],
        taskColumns: createDefaultBoardColumns(),
        notifications: [],
        csdBoard: { certainties: [], assumptions: [], doubts: [] },
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });

      // Criar referência do usuário
      await addDoc(collection(db, 'userTeams'), {
        userId: user.uid,
        teamId,
        teamName: newTeamData.teamName,
        addedAt: new Date().toISOString(),
      });

      // Reset form
      setNewTeamData({ teamName: '', course: '', className: '' });
      setIsCreatingTeam(false);

      // Reload teams
      setTeams(await loadUserTeamWorkspaces(user.uid));
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.course.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || team.projectStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalStudents = teams.reduce((sum, team) => sum + getStudentTeamMembers(team).length, 0);
  const totalFaculty = teams.reduce((sum, team) => sum + getFacultyTeamMembers(team).length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando equipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                <Sparkles size={14} />
                Workspace de equipes
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Equipes em cards, como no Teams do desktop</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/90">
                Cada card mostra o ícone da equipe, status, progresso, professores e discentes para abrir o workspace rapidamente.
              </p>
            </div>

            <button
              onClick={() => setIsCreatingTeam(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-lg transition hover:bg-blue-50"
            >
              <Plus size={20} />
              Nova Equipe
            </button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Equipes</p>
              <p className="mt-2 text-3xl font-black">{teams.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Discentes</p>
              <p className="mt-2 text-3xl font-black">{totalStudents}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Docentes</p>
              <p className="mt-2 text-3xl font-black">{totalFaculty}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Create Team Modal */}
      {isCreatingTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Criar Nova Equipe</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome da Equipe
                </label>
                <input
                  type="text"
                  value={newTeamData.teamName}
                  onChange={(e) =>
                    setNewTeamData({ ...newTeamData, teamName: e.target.value })
                  }
                  placeholder="Ex: Projeto XYZ"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Curso
                </label>
                <input
                  type="text"
                  value={newTeamData.course}
                  onChange={(e) =>
                    setNewTeamData({ ...newTeamData, course: e.target.value })
                  }
                  placeholder="Ex: Análise e Desenvolvimento de Sistemas"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Turma
                </label>
                <input
                  type="text"
                  value={newTeamData.className}
                  onChange={(e) =>
                    setNewTeamData({ ...newTeamData, className: e.target.value })
                  }
                  placeholder="Ex: Turma A - Manhã"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingTeam(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Criar Equipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou curso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'Planejamento', 'Em Andamento', 'Concluído'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {status === 'all' ? 'Todas' : status}
            </button>
          ))}
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <Users size={48} className="mx-auto mb-4 text-slate-400" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma equipe encontrada</h4>
          <p className="text-slate-600">
            {searchQuery ? 'Tente refinar sua busca' : 'Crie sua primeira equipe para começar'}
          </p>
          <button
            onClick={() => setIsCreatingTeam(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Criar equipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
          {filteredTeams.map((team) => (
            <Link
              key={team.teamId}
              href={`/dashboard/teams/${team.teamId}`}
              className="group block overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 lg:p-5">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg lg:h-16 lg:w-16">
                      {getTeamLogoSource(team) ? (
                        <img
                          src={getTeamLogoSource(team)}
                          alt={team.teamName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-black tracking-wider">
                          {team.teamName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="absolute -right-2 -bottom-2 rounded-full border-2 border-white bg-blue-600 p-1.5 text-white shadow-md">
                      <FolderKanban size={12} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Workspace da equipe</p>
                        <h4 className="mt-1 truncate text-lg font-bold text-slate-900 transition group-hover:text-blue-700 lg:text-xl">
                          {team.teamName}
                        </h4>
                      </div>
                      <div
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:text-xs ${
                          team.projectStatus === 'Concluído'
                            ? 'bg-emerald-100 text-emerald-700'
                            : team.projectStatus === 'Em Andamento'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {team.projectStatus}
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-600 lg:text-sm">{team.course || 'Curso não informado'}</p>
                    {team.className && <p className="mt-1 text-[11px] text-slate-500 lg:text-xs">{team.className}</p>}
                    <p className="mt-2 text-[11px] text-slate-500 lg:text-xs">{buildTeamBalanceLabel(team)}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4 lg:p-5">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold lg:text-xs">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                      {getStudentTeamMembers(team).length} aluno(s)
                    </span>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                      {getFacultyTeamMembers(team).length} docente(s)
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                      {buildTeamProfessorFocusLabel(team)}
                    </span>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 lg:text-sm">Progresso</span>
                      <span className="text-xs font-bold text-slate-900 lg:text-sm">{team.projectProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${team.projectProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs sm:grid-cols-2 lg:text-sm">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-600">
                      <Users size={16} className="text-slate-400" />
                      <span>{getStudentTeamMembers(team).length} alunos</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{team.projectDeadline ? new Date(team.projectDeadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                    </div>
                  </div>

                  {getStudentTeamMembers(team).length > 0 && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex -space-x-2">
                        {getStudentTeamMembers(team).slice(0, 3).map((member, idx) => (
                          <div key={idx} title={member.name}>
                            <AvatarDisplay
                              avatar={member.avatar}
                              imageSrc={member.profilePhotoSource || ''}
                              size="sm"
                              fallback={member.name.charAt(0).toUpperCase()}
                            />
                          </div>
                        ))}
                        {getStudentTeamMembers(team).length > 3 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-slate-300 text-xs font-bold text-slate-700">
                            +{getStudentTeamMembers(team).length - 3}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Equipe ativa</p>
                        <p className="truncate text-sm font-semibold text-slate-900">{team.teamName}</p>
                      </div>
                    </div>
                  )}

                  {getFacultyTeamMembers(team).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getFacultyTeamMembers(team).slice(0, 2).map((member) => (
                        <span key={member.userId || member.name} className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 lg:px-3 lg:text-xs">
                          {member.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto border-t border-slate-100 pt-3 lg:pt-4">
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-blue-700">
                      Abrir workspace
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
