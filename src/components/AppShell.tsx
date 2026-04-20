import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { appendAuditLog } from '../utils/auditLog';
import { notifySuccess } from '../utils/notify';
import { AnimatedLogoBackground } from './AnimatedLogoBackground';
import { SupportWidget } from './SupportWidget';

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AppShell = ({ children, title, subtitle }: AppShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      appendAuditLog({
        action: 'logout',
        module: 'auth',
        detail: `${user?.username ?? 'unknown user'} logged out`,
      });
      clearUser();
      notifySuccess('Oturum kapatildi.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-black font-body text-slate-100">
      <AnimatedLogoBackground opacity={0.2} className="mix-blend-screen" />
      <header className="border-b border-brand-500/20 bg-black/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm tracking-[0.18em] uppercase text-brand-300/80 font-semibold hover:text-brand-200 transition-colors"
            aria-label="Ana sayfaya git"
          >
            NOGAPS
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(user ? '/profile' : '/login')}
              aria-label={user ? 'Profil' : 'Giris yap'
              }
              className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/80 p-3 text-slate-200 hover:bg-brand-500/20 transition-all duration-150"
            >
              <User size={18} />
            </button>

            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-brand-300 font-display">
                    {user.fullName?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-base font-medium text-slate-200">{user.fullName}</p>
                  <span className="text-sm text-brand-300/80 font-mono">{user.role}</span>
                </div>
              </div>
            ) : null}

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-brand-500/20 transition-all duration-150 text-base"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Cikis</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          {location.pathname !== '/' && location.pathname !== '/dashboard' && location.pathname !== '/login' && location.pathname !== '/register' && (
            <button
              type="button"
              onClick={() => {
                const target = user?.role === 'user' ? '/' : user ? '/dashboard' : '/';
                navigate(target);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition"
            >
              <ArrowLeft size={16} />
              Geri
            </button>
          )}
        </div>
        <div className="mb-10 animate-fade-up" style={{ opacity: 0 }}>
          <p className="text-sm font-semibold tracking-widest uppercase text-brand-300 mb-2">NOGAPS</p>
          <h1 className="font-display text-4xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-slate-300 mt-2 text-base">{subtitle}</p>}

        </div>
        {children}
      </main>
      <SupportWidget />
    </div>
  );
};
