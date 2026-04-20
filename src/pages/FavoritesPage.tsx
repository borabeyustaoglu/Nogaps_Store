import { useEffect, useMemo, useState } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { favoritesApi } from '../api/favorites';
import type { FavoriteProduct } from '../types/favorite';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';
import { useAuthStore } from '../store/authStore';
import { cartApi } from '../api/cart';
import type { CartItem } from '../types/cart';
import { STORAGE_KEYS } from '../constants/storage';

const CART_STORAGE_KEY = STORAGE_KEYS.cart;

const readCartItems = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const FavoritesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const authenticated = isAuthenticated();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(() =>
    readCartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  const syncFavorites = async () => {
    setIsLoading(true);
    try {
      const items = await favoritesApi.listFavorites();
      setFavorites(items);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Favoriler yuklenemedi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void syncFavorites();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      let active = true;
      const syncRemoteCart = async () => {
        try {
          const lines = await cartApi.listCart();
          if (!active) return;
          setCartCount(lines.reduce((sum, line) => sum + line.quantity, 0));
        } catch {
          if (!active) return;
        }
      };
      void syncRemoteCart();
      return () => {
        active = false;
      };
    }

    const onLocalUpdate = () => {
      setCartCount(readCartItems().reduce((sum, item) => sum + item.quantity, 0));
    };
    window.addEventListener('nogaps:cart-updated', onLocalUpdate);
    return () => {
      window.removeEventListener('nogaps:cart-updated', onLocalUpdate);
    };
  }, [authenticated]);

  const subtotal = useMemo(
    () => favorites.reduce((sum, item) => sum + item.price, 0),
    [favorites]
  );

  const removeFavorite = async (productId: number) => {
    try {
      await favoritesApi.removeFavorite(productId);
      setFavorites((prev) => prev.filter((item) => item.productId !== productId));
      window.dispatchEvent(new Event('nogaps:favorites-updated'));
      notifySuccess('Urun favorilerden kaldirildi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Favori kaldirilamadi.'));
    }
  };

  const addToCart = async (productId: number, name: string) => {
    if (!authenticated) {
      const cartItems = readCartItems();
      const idAsString = String(productId);
      const existing = cartItems.find((item) => item.productId === idAsString);
      const next = existing
        ? cartItems.map((item) =>
            item.productId === idAsString ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...cartItems, { productId: idAsString, quantity: 1 }];
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      setCartCount(next.reduce((sum, item) => sum + item.quantity, 0));
      window.dispatchEvent(new Event('nogaps:cart-updated'));
      notifySuccess(`${name} sepete eklendi.`);
      return;
    }

    try {
      await cartApi.addToCart({ productId, quantity: 1 });
      const lines = await cartApi.listCart();
      setCartCount(lines.reduce((sum, line) => sum + line.quantity, 0));
      notifySuccess(`${name} sepete eklendi.`);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Sepete eklenemedi.'));
    }
  };

  return (
    <StoreLayout
      title="Favorilerim"
      subtitle="Kalp ile kaydettigin urunleri buradan yonetebilirsin."
      cartCount={cartCount}
    >
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {isLoading ? 'Yukleniyor...' : `${favorites.length} urun favorilerde`}
            </p>
            <button
              type="button"
              onClick={() => void syncFavorites()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
            >
              Yenile
            </button>
          </div>
          <div className="space-y-3">
            {!isLoading && favorites.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-black/40 p-6 text-center text-slate-400">
                Henuz favori urun yok.
              </div>
            )}
            {favorites.map((item) => (
              <article key={item.favoriteId} className="rounded-xl border border-slate-800 bg-black/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-lg font-semibold text-white transition hover:text-brand-200"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.categoryName ?? 'Kategori yok'} | TRY {item.price.toLocaleString('tr-TR')}
                    </p>
                    {item.description && (
                      <p className="mt-2 text-sm text-slate-500">{item.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeFavorite(item.productId)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
                    aria-label="Favoriden kaldir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void addToCart(item.productId, item.name)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                  >
                    <ShoppingCart size={14} />
                    Sepete ekle
                  </button>
                  <Link
                    to={`/product/${item.productId}`}
                    className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-500/40"
                  >
                    Urunu incele
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center gap-2 text-brand-300">
            <Heart size={16} />
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">Favori Ozeti</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Urun sayisi</span>
              <span>{favorites.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Toplam deger</span>
              <span>TRY {subtotal.toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="mt-5 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Sepete git
          </button>
        </aside>
      </section>
    </StoreLayout>
  );
};

