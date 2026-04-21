'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/useAuth';
import AvatarDisplay from '../../components/AvatarDisplay';
import { DEFAULT_AVATAR } from '../../lib/avatarService';
import { getUserProfileService, type UserProfile } from '../../lib/userProfileService';
import {
  buildTeamBalanceLabel,
  buildTeamLeadershipLabel,
  buildTeamProfessorFocusLabel,
  getFacultyTeamMembers,
  getStudentTeamMembers,
  loadUserTeamWorkspaces,
  type TeamWorkspace,
} from '../../lib/teamWorkspaceService';
import {
  Users,
  Calendar,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  BookOpen,
  Trophy,
  Briefcase,
} from 'lucide-react';

interface Stats {
  totalTeams: number;
  activeProjects: number;
  upcomingDeadlines: number;
  completedMilestones: number;
}

export default function DashboardPage() {
  const user = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWorkspace[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalTeams: 0,
    activeProjects: 0,
    upcomingDeadlines: 0,
    completedMilestones: 0,
  });

  useEffect(() => {
    if (!user) return;

    const loadTeams = async () => {
      try {
        const profileService = getUserProfileService();
        const [profile, loadedTeams] = await Promise.all([
          profileService.getUserProfile(user.uid),
          loadUserTeamWorkspaces(user.uid),
        ]);

        setCurrentProfile(profile);
        setTeams(loadedTeams);

        // Calculate stats
        const upcomingCount = loadedTeams.filter((t) => {
          if (!t.projectDeadline) return false;
          const deadline = new Date(t.projectDeadline);
          const today = new Date();
          const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil > 0 && daysUntil <= 7;
        }).length;

        setStats({
          totalTeams: loadedTeams.length,
          activeProjects: loadedTeams.filter((t) => t.projectProgress < 100).length,
          upcomingDeadlines: upcomingCount,
          completedMilestones: loadedTeams.filter((t) => t.projectProgress === 100).length,
        });
      } catch (error) {
        console.error('Erro ao carregar equipes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando suas equipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <AvatarDisplay
              avatar={currentProfile?.avatar || DEFAULT_AVATAR}
              imageSrc={currentProfile?.profilePhotoSource || ''}
              size="lg"
              fallback={currentProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              className="border border-white/20 shadow-lg"
            />
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Bem-vindo, {currentProfile?.displayName || user?.displayName || 'Colega'}! 👋
              </h2>
              <p className="text-blue-100 mb-1">
                {currentProfile?.headline || 'Seu painel acadêmico e de equipes está pronto para uso.'}
              </p>
              <p className="text-blue-100/90">
                Você está acompanhando {stats.totalTeams} {stats.totalTeams === 1 ? 'equipe' : 'equipes'} de projeto.
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition self-start">
            <Plus size={20} />
            Criar Nova Equipe
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            icon: Briefcase,
            label: 'Equipes Totais',
            value: stats.totalTeams,
            color: 'from-blue-500 to-blue-600',
          },
          {
            icon: TrendingUp,
            label: 'Projetos em Andamento',
            value: stats.activeProjects,
            color: 'from-purple-500 to-purple-600',
          },
          {
            icon: Clock,
            label: 'Prazos Próximos',
            value: stats.upcomingDeadlines,
            color: 'from-orange-500 to-orange-600',
          },
          {
            icon: Trophy,
            label: 'Projetos Concluídos',
            value: stats.completedMilestones,
            color: 'from-green-500 to-green-600',
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <Icon size={24} className="text-white" />
              </div>
              <p className="text-slate-600 text-sm font-medium mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Teams Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">Suas Equipes</h3>
          <a
            href="/dashboard/teams"
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2"
          >
            Ver Todas
            <ArrowRight size={16} />
          </a>
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
            <BookOpen size={48} className="mx-auto text-slate-400 mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma equipe ainda</h4>
            <p className="text-slate-600 mb-6">Crie sua primeira equipe para começar a colaborar.</p>
            <button className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition">
              <Plus size={20} />
              Criar Equipe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
            {teams.map((team) => {
              const deadline = team.projectDeadline
                ? new Date(team.projectDeadline).toLocaleDateString('pt-BR')
                : 'Sem prazo';
              const studentMembers = getStudentTeamMembers(team);
              const facultyMembers = getFacultyTeamMembers(team);

              return (
                <Link
                  key={team.teamId}
                  href={`/dashboard/teams/${team.teamId}`}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group block"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-4 lg:p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-base lg:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {team.teamName}
                        </h4>
                        <p className="text-xs lg:text-sm text-slate-600">{team.course}</p>
                        <p className="text-[11px] lg:text-xs text-slate-500 mt-1">{buildTeamBalanceLabel(team)}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[11px] lg:text-xs font-semibold ${
                        team.projectStatus === 'Concluído'
                          ? 'bg-green-100 text-green-700'
                          : team.projectStatus === 'Em Andamento'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {team.projectStatus}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 lg:p-5 space-y-3 lg:space-y-4">
                    <div className="flex flex-wrap gap-2 text-[11px] lg:text-xs font-semibold">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {studentMembers.length} aluno(s)
                      </span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                        {facultyMembers.length} docente(s)
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        {buildTeamProfessorFocusLabel(team)}
                      </span>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs lg:text-sm font-semibold text-slate-700">Progresso</span>
                        <span className="text-xs lg:text-sm font-bold text-slate-900">{team.projectProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                          style={{ width: `${team.projectProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Members */}
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-600">
                      <Users size={16} className="text-slate-400" />
                      <span>{studentMembers.length} {studentMembers.length === 1 ? 'aluno' : 'alunos'}</span>
                    </div>

                    {facultyMembers.length > 0 && (
                      <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-600">
                        <Briefcase size={16} className="text-slate-400" />
                        <span>{facultyMembers.length} {facultyMembers.length === 1 ? 'docente' : 'docentes'} em orientação</span>
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      <span>Prazo: {deadline}</span>
                    </div>

                    {/* Members Avatars Preview */}
                    {studentMembers.length > 0 && (
                      <div className="flex -space-x-2">
                        {studentMembers.slice(0, 3).map((member, idx) => (
                          <div key={idx} title={member.name}>
                            <AvatarDisplay
                              avatar={member.avatar}
                              imageSrc={member.profilePhotoSource || ''}
                              size="sm"
                              fallback={member.name.charAt(0).toUpperCase()}
                            />
                          </div>
                        ))}
                        {studentMembers.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold border border-white">
                            +{studentMembers.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {facultyMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {facultyMembers.slice(0, 2).map((member) => (
                          <span key={member.userId || member.name} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {member.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="border-t border-slate-200 p-3 lg:p-4 bg-slate-50">
                    <span className="w-full flex items-center justify-center gap-2 text-sm lg:text-base text-blue-600 font-semibold hover:text-blue-700 transition py-1.5">
                      Abrir Projeto
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Atividades Recentes</h3>
        <div className="space-y-4">
          {teams.slice(0, 3).map((team) => (
            <div key={team.teamId} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:pb-0 last:border-b-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Briefcase size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {team.teamName}
                </p>
                <p className="text-xs text-slate-600">
                  Atualizado: {new Date(team.updatedAt).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{buildTeamLeadershipLabel(team)}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{team.projectProgress}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
