import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ReceiptText, ShoppingCart, UserCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuthStore } from '../store/authStore';
import { SupportWidget } from './SupportWidget';
import { favoritesApi } from '../api/favorites';
import { normalizeRole } from '../utils/roles';

interface StoreLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  cartCount: number;
}

export const StoreLayout = ({
  children,
  title,
  subtitle,
  cartCount,
}: StoreLayoutProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const authenticated = isAuthenticated();
  const isUserRole = normalizeRole(user?.role) === 'user';
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    if (!authenticated || !isUserRole) {
      setFavoritesCount(0);
      return;
    }
    let active = true;
    const syncFavorites = async () => {
      try {
        const items = await favoritesApi.listFavorites();
        if (!active) return;
        setFavoritesCount(items.length);
      } catch {
        if (!active) return;
      }
    };
    void syncFavorites();

    const onFavoritesUpdated = () => {
      void syncFavorites();
    };
    window.addEventListener('nogaps:favorites-updated', onFavoritesUpdated);
    return () => {
      active = false;
      window.removeEventListener('nogaps:favorites-updated', onFavoritesUpdated);
    };
  }, [authenticated, isUserRole]);

  return (
    <div className="store-surface min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-[112rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandLogo compact className="h-12 w-auto" />
            <span className="hidden text-lg font-semibold tracking-[0.2em] text-brand-300 sm:inline">
              NOGAPS STORE
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {authenticated && isUserRole && (
              <button
                type="button"
                onClick={() => navigate('/favorites')}
                className="relative inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 text-slate-200 transition hover:border-brand-500/60 hover:text-white"
                aria-label="Favorilere git"
              >
                <Heart size={22} />
                {favoritesCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}
            {authenticated && isUserRole && (
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 text-slate-200 transition hover:border-brand-500/60 hover:text-white"
                aria-label="Siparislerim"
                title="Siparislerim"
              >
                <ReceiptText size={20} />
                <span className="hidden text-sm font-semibold sm:inline">Siparislerim</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 text-slate-200 transition hover:border-brand-500/60 hover:text-white"
              aria-label="Sepete git"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(authenticated ? '/dashboard' : '/login')}
              className="inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 text-slate-200 transition hover:border-brand-500/60 hover:text-white"
              aria-label={authenticated ? 'Profile git' : 'Giris yap'}
              title={authenticated ? 'Profil' : 'Giris yap'}
            >
              <UserCircle2 size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[112rem] px-4 py-8 sm:px-6 lg:px-8">
        {(title || subtitle) && (
          <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
            {title && <h1 className="font-display text-3xl font-bold text-white">{title}</h1>}
            {subtitle && <p className="mt-2 text-base text-slate-300">{subtitle}</p>}
            {authenticated && (
              <p className="mt-3 text-sm text-brand-300">Hos geldin, {user?.fullName}</p>
            )}
          </section>
        )}
        {children}
      </main>

      <SupportWidget />
    </div>
  );
};
