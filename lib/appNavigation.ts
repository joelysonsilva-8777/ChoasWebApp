import { type LucideIcon, Home, MessageCircle, Users, Briefcase, BookOpen, Calendar, FileText, Settings, Building2 } from 'lucide-react';

export type AppNavId =
  | 'overview'
  | 'chats'
  | 'connections'
  | 'teams'
  | 'teaching'
  | 'calendar'
  | 'files'
  | 'profile'
  | 'settings'
  | 'projects'
  | 'contactInstitutional';

export type AppNavItem = {
  label: string;
  icon: LucideIcon;
  id: AppNavId;
  href: string;
};

export const appNavItems: AppNavItem[] = [
  { label: 'Visão Geral', icon: Home, id: 'overview', href: '/dashboard' },
  { label: 'Chats', icon: MessageCircle, id: 'chats', href: '/chat' },
  { label: 'Conexões', icon: Users, id: 'connections', href: '/dashboard/connections' },
  { label: 'Equipes', icon: Briefcase, id: 'teams', href: '/dashboard/teams' },
  { label: 'Docência', icon: BookOpen, id: 'teaching', href: '/dashboard/teaching' },
  { label: 'Calendário', icon: Calendar, id: 'calendar', href: '/dashboard/calendar' },
  { label: 'Arquivos', icon: FileText, id: 'files', href: '/dashboard/files' },
  { label: 'Configurações', icon: Settings, id: 'settings', href: '/settings' },
];

export const companyNavItems: AppNavItem[] = [
  { label: 'Chats', icon: MessageCircle, id: 'chats', href: '/dashboard/chats' },
  { label: 'Conexões', icon: Users, id: 'connections', href: '/dashboard/connections' },
  { label: 'Projetos', icon: Briefcase, id: 'projects', href: '/dashboard/projetos' },
  { label: 'Contato Institucional', icon: Building2, id: 'contactInstitutional', href: '/dashboard/contato-institucional' },
];

export function getAppNavIdFromPath(pathname: string): AppNavId {
  if (pathname.startsWith('/chat')) return 'chats';
  if (pathname.startsWith('/dashboard/chats')) return 'chats';
  if (pathname.startsWith('/dashboard/teams')) return 'teams';
  if (pathname.startsWith('/dashboard/teaching')) return 'teaching';
  if (pathname.startsWith('/dashboard/calendar')) return 'calendar';
  if (pathname.startsWith('/dashboard/files')) return 'files';
  if (pathname.startsWith('/dashboard/connections')) return 'connections';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboard')) return 'overview';
  return 'overview';
}

export function getCompanyNavIdFromPath(pathname: string): AppNavId {
  if (pathname.startsWith('/chat')) return 'chats';
  if (pathname.startsWith('/dashboard/chats')) return 'chats';
  if (pathname.startsWith('/dashboard/connections')) return 'connections';
  if (pathname.startsWith('/connections')) return 'connections';
  if (pathname.startsWith('/dashboard/projetos')) return 'projects';
  if (pathname.startsWith('/dashboard/teams')) return 'projects';
  if (pathname.startsWith('/dashboard/contato-institucional')) return 'contactInstitutional';
  if (pathname.startsWith('/dashboard')) return 'projects';
  return 'projects';
}
