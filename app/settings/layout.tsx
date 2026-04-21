'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import AppShell from '../../components/AppShell';
import { DEFAULT_AVATAR, type AvatarComponents } from '../../lib/avatarService';
import { getUserProfileService } from '../../lib/userProfileService';
import { appNavItems, companyNavItems, getAppNavIdFromPath, getCompanyNavIdFromPath, type AppNavId } from '../../lib/appNavigation';

const routeByNavId: Record<string, string> = {
  overview: '/dashboard',
  chats: '/chat',
  connections: '/dashboard/connections',
  teams: '/dashboard/teams',
  teaching: '/dashboard/teaching',
  calendar: '/dashboard/calendar',
  files: '/dashboard/files',
  settings: '/settings',
};

function getNavIdFromPath(pathname: string): string {
  if (pathname.startsWith('/chat')) return 'chats';
  if (pathname.startsWith('/dashboard/teams')) return 'teams';
  if (pathname.startsWith('/dashboard/teaching')) return 'teaching';
  if (pathname.startsWith('/dashboard/calendar')) return 'calendar';
  if (pathname.startsWith('/dashboard/files')) return 'files';
  if (pathname.startsWith('/dashboard/connections')) return 'connections';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboard')) return 'overview';
  return 'overview';
}

interface User {
  uid: string;
  email?: string;
  displayName?: string;
  avatar: AvatarComponents;
  profilePhotoSource?: string;
  role?: string;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      void (async () => {
        try {
          const profile = await getUserProfileService().getUserProfile(currentUser.uid);
          setUser({
            uid: currentUser.uid,
            email: profile?.email || currentUser.email || '',
            displayName: profile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            avatar: profile?.avatar || DEFAULT_AVATAR,
            profilePhotoSource: profile?.profilePhotoSource || profile?.profilePhoto || '',
            role: profile?.role || 'student',
          });
        } catch (error) {
          console.error('Erro ao carregar perfil do usuário:', error);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            avatar: DEFAULT_AVATAR,
            profilePhotoSource: '',
            role: 'student',
          });
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [router]);

  const isCompanyAccount = user?.role === 'company';
  const activeNav: AppNavId = isCompanyAccount ? getCompanyNavIdFromPath(pathname) : getAppNavIdFromPath(pathname);
  const navItems = isCompanyAccount ? companyNavItems : appNavItems;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title={isCompanyAccount ? 'Configurações empresariais' : 'Configurações'}
      navItems={navItems}
      activeNavId={activeNav}
      user={user ? {
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        profilePhotoSource: user.profilePhotoSource,
      } : null}
      onLogout={handleLogout}
      contentClassName="w-full min-h-screen px-0 pb-0 pt-16 sm:px-0 sm:pt-16 lg:px-0 lg:pb-0 lg:pt-8"
    >
      {children}
    </AppShell>
  );
}
