"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Home, LayoutDashboard, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';

const hiddenOnRoutes = ['/dashboard', '/profile', '/settings', '/chat', '/connections', '/files'];

function isHiddenRoute(pathname: string) {
  return hiddenOnRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; displayName?: string | null; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(
        currentUser
          ? {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
            }
          : null,
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (isHiddenRoute(pathname)) {
    return null;
  }

  const isAuthenticated = Boolean(user);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 shadow-sm shadow-slate-950/10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-3 text-white transition hover:opacity-80">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
            <img src="/img/tesseractICO.png" alt="Choas Logo" className="h-6 w-6" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Choas</span>
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <Link href="/#features" className="text-sm font-medium text-slate-300 transition hover:text-white">
            Recursos
          </Link>
          <Link href="/#contact" className="text-sm font-medium text-slate-300 transition hover:text-white">
            Contato
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Ir para home"
          >
            <Home size={20} />
          </Link>
          {loading ? (
            <span className="hidden h-10 w-24 rounded-full bg-white/10 sm:inline-flex" />
          ) : isAuthenticated ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
              >
                <LayoutDashboard size={16} />
                Painel
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
