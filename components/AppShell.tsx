'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react';
import AvatarDisplay from './AvatarDisplay';
import { DEFAULT_AVATAR, type AvatarComponents } from '../lib/avatarService';
import { type AppNavId, type AppNavItem } from '../lib/appNavigation';

type ShellUser = {
  displayName?: string;
  email?: string;
  avatar?: AvatarComponents;
  profilePhotoSource?: string;
};

type AppShellProps = {
  title: string;
  navItems: AppNavItem[];
  activeNavId: AppNavId;
  user: ShellUser | null;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
  contentClassName?: string;
  sidebarFooterContent?: ReactNode | null;
};

const defaultContentClassName = 'mx-auto min-h-screen max-w-[1600px] px-4 pb-8 pt-20 sm:px-6 sm:pt-20 lg:px-8 lg:pb-10 lg:pt-8';

export default function AppShell({
  title,
  navItems,
  activeNavId,
  user,
  onLogout,
  children,
  contentClassName = defaultContentClassName,
  sidebarFooterContent,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const handleNavigate = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };

  const shellUserAvatar = user?.avatar || DEFAULT_AVATAR;
  const defaultSidebarFooter = (
    <div className="border-t border-slate-200 p-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <AvatarDisplay
            avatar={shellUserAvatar}
            imageSrc={user?.profilePhotoSource || ''}
            size="sm"
            fallback={user?.displayName?.charAt(0).toUpperCase() || 'U'}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.displayName || 'Usuário'}</p>
            <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => handleNavigate('/profile')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeNavId === 'profile'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 lg:text-slate-700'
            }`}
          >
            <Settings size={16} />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/settings')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeNavId === 'settings'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 lg:text-slate-700'
            }`}
          >
            <Settings size={16} />
            Ajustes
          </button>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 lg:text-red-700"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
  const footerContent = sidebarFooterContent === undefined ? defaultSidebarFooter : sidebarFooterContent;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/92 px-4 shadow-sm backdrop-blur-lg lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Choas</p>
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[86vw] flex-col border-r border-slate-200 bg-white/96 shadow-2xl shadow-slate-950/10 backdrop-blur-xl transition-transform duration-300 lg:w-72 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 lg:h-20 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-950/20">
              C
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 lg:text-base">Choas</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            aria-label="Fechar navegação"
          >
            <PanelLeftClose size={18} />
          </button>

          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:inline-flex"
            aria-label="Navegação fixa"
            tabIndex={-1}
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 lg:px-4 lg:py-6">
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-slate-900 hover:bg-slate-100 lg:text-slate-700'
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </nav>

        {footerContent ? footerContent : null}
      </aside>

      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Fechar navegação"
        />
      )}

      <main className="min-h-screen lg:pl-72">
        <div className={`min-h-screen ${contentClassName}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
