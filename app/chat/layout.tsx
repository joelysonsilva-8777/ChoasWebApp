'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import AppShell from '../../components/AppShell';
import { DEFAULT_AVATAR, type AvatarComponents } from '../../lib/avatarService';
import { getUserProfileService } from '../../lib/userProfileService';
import { appNavItems, companyNavItems, getAppNavIdFromPath, getCompanyNavIdFromPath, type AppNavId } from '../../lib/appNavigation';

interface User {
  uid: string;
  email?: string;
  displayName?: string;
  avatar: AvatarComponents;
  profilePhotoSource?: string;
  role?: string;
}

export default function ChatLayout({
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const isCompanyAccount = user?.role === 'company';
  const activeNav: AppNavId = isCompanyAccount ? getCompanyNavIdFromPath(pathname) : getAppNavIdFromPath(pathname);
  const navItems = isCompanyAccount ? companyNavItems : appNavItems;

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
      title={isCompanyAccount ? 'Conversas da empresa' : 'Conversas'}
      navItems={navItems}
      activeNavId={activeNav}
      user={user ? {
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        profilePhotoSource: user.profilePhotoSource,
      } : null}
      onLogout={handleLogout}
      contentClassName="w-full h-[calc(100dvh-4rem)] px-0 pb-0 pt-16 sm:px-0 sm:pt-16 lg:h-[calc(100dvh-7rem)] lg:px-0 lg:pb-0 lg:pt-8"
    >
      {children}
    </AppShell>
  );
}
