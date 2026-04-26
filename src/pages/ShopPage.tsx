import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Trash2,
} from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { STORAGE_KEYS } from '../constants/storage';
import { appendAuditLog } from '../utils/auditLog';
import { readProductsFromStorage, persistProductsToStorage } from '../utils/productStore';
import { catalogApi } from '../api/catalog';
import { getProductImage } from '../utils/productImages';
import type { Product } from '../types/product';
import type { CartItem } from '../types/cart';
import { useAuthStore } from '../store/authStore';
import { cartApi } from '../api/cart';
import { getApiErrorMessage } from '../utils/apiError';
import { favoritesApi } from '../api/favorites';
import { notifyError } from '../utils/notify';
import { normalizeRole } from '../utils/roles';
import {
  CATEGORY_SPEC_DEFINITIONS,
  type CategorySpecDefinition,
} from '../constants/categorySpecs';
import { readGuestCart, writeGuestCart } from '../utils/guestCart';

const RECENTLY_VIEWED_PRODUCTS_KEY = STORAGE_KEYS.recentlyViewedProducts;
const PRODUCTS_PER_PAGE = 12;

interface CartPreviewItem {
  key: string;
  productId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

const readCartItems = (): CartItem[] => readGuestCart();

const hashString = (value: string) =>
  value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const resolveLocalCartPreview = (products: Product[]): CartPreviewItem[] => {
  const productById = products.reduce<Record<string, Product>>((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
  return readCartItems()
    .map((item) => {
      const product = productById[item.productId];
      if (!product) return null;
      const numericId = Number(item.productId);
      return {
        key: item.productId,
        productId: Number.isInteger(numericId) && numericId > 0 ? numericId : null,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        imageUrl: getProductImage(product.category, product.imageUrl),
      };
    })
    .filter((item): item is CartPreviewItem => item !== null);
};

const FALLBACK_POPULAR = [
  'RTX 5090 Ti',
  'Aurora X1 Gamer Laptop',
  'Quantum Mechanical Keyboard',
  'Nebula 360Hz Monitor',
];

export const ShopPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [popularOnly, setPopularOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<
    'recommended' | 'best_selling' | 'price_desc' | 'price_asc' | 'name_asc'
  >('recommended');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>(() => readProductsFromStorage());
  const [categorySpecDefinitions, setCategorySpecDefinitions] = useState<CategorySpecDefinition[]>(
    CATEGORY_SPEC_DEFINITIONS
  );
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({});
  const [cartCount, setCartCount] = useState(() =>
    readCartItems().reduce((sum, item) => sum + item.quantity, 0)
  );
  const [cartPreview, setCartPreview] = useState<CartPreviewItem[]>(() =>
    resolveLocalCartPreview(readProductsFromStorage())
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isRemovingCartItem, setIsRemovingCartItem] = useState<string | null>(null);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<number>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);
  const [flashNow, setFlashNow] = useState(Date.now());
  const { user, isAuthenticated } = useAuthStore();
  const authenticated = isAuthenticated();
  const isUserRole = normalizeRole(user?.role) === 'user';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlashNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const syncProducts = async () => {
      try {
        const backendProducts = await catalogApi.getProducts();
        if (!active || backendProducts.length === 0) return;
        persistProductsToStorage(backendProducts);
        setProducts(backendProducts);
      } catch {
        if (!active) return;
      }
    };
    const syncCategorySpecs = async () => {
      try {
        const definitions = await catalogApi.getCategorySpecDefinitions();
        if (!active || definitions.length === 0) return;
        setCategorySpecDefinitions(definitions);
      } catch {
        if (!active) return;
      }
    };
    void syncProducts();
    void syncCategorySpecs();
    return () => {
      active = false;
    };
  }, []);

  const syncRemoteCart = async () => {
    setIsCartLoading(true);
    try {
      const lines = await cartApi.listCart();
      const productByNumericId = products.reduce<Map<number, Product>>((acc, product) => {
        const numericId = Number(product.id);
        if (Number.isInteger(numericId) && numericId > 0) acc.set(numericId, product);
        return acc;
      }, new Map<number, Product>());

      const mapped = lines.map((line) => {
        const product = productByNumericId.get(line.productId);
        return {
          key: String(line.productId),
          productId: line.productId,
          name: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          imageUrl: product
            ? getProductImage(product.category, product.imageUrl)
            : getProductImage('General'),
        };
      });

      setCartPreview(mapped);
      setCartCount(mapped.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      // keep current state when cart API is unavailable
    } finally {
      setIsCartLoading(false);
    }
  };

  const syncLocalCart = () => {
    const localPreview = resolveLocalCartPreview(products);
    setCartPreview(localPreview);
    setCartCount(localPreview.reduce((sum, item) => sum + item.quantity, 0));
  };

  useEffect(() => {
    if (authenticated) {
      void syncRemoteCart();
      return;
    }

    syncLocalCart();
    const handleLocalUpdate = () => syncLocalCart();
    window.addEventListener('nogaps:cart-updated', handleLocalUpdate);
    return () => {
      window.removeEventListener('nogaps:cart-updated', handleLocalUpdate);
    };
  }, [authenticated, products]);

  useEffect(() => {
    if (!authenticated || !isUserRole) {
      setFavoriteProductIds(new Set());
      return;
    }
    let active = true;
    const syncFavorites = async () => {
      try {
        const favorites = await favoritesApi.listFavorites();
        if (!active) return;
        setFavoriteProductIds(new Set(favorites.map((item) => item.productId)));
      } catch {
        if (!active) return;
      }
    };
    void syncFavorites();
    return () => {
      active = false;
    };
  }, [authenticated, isUserRole]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.category))).sort()],
    [products]
  );

  const selectedCategorySpecDefinition = useMemo(
    () => categorySpecDefinitions.find((item) => item.categoryName === category),
    [categorySpecDefinitions, category]
  );

  const selectedCategoryProducts = useMemo(
    () => products.filter((product) => product.category === category),
    [products, category]
  );

  const specFilterOptions = useMemo(() => {
    const definition = selectedCategorySpecDefinition;
    if (!definition) return [];
    return definition.fields.map((field) => {
      const productValues = selectedCategoryProducts
        .map((product) => product.specs?.[field.key] ?? '')
        .filter((value) => value.length > 0);
      const merged = Array.from(new Set([...field.options, ...productValues]));
      return {
        ...field,
        options: merged,
      };
    });
  }, [selectedCategorySpecDefinition, selectedCategoryProducts]);

  const popularProductIds = useMemo(() => {
    const sorted = [...products].sort((a, b) => b.stock * b.price - a.stock * a.price);
    return new Set(sorted.slice(0, Math.min(8, sorted.length)).map((product) => product.id));
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = search.trim().toLowerCase();
        const parsedMinPrice = Number(minPrice);
        const parsedMaxPrice = Number(maxPrice);
        const hasMinPrice = minPrice.trim().length > 0 && Number.isFinite(parsedMinPrice);
        const hasMaxPrice = maxPrice.trim().length > 0 && Number.isFinite(parsedMaxPrice);
        const matchesQuery =
          query.length === 0 ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query);
        const matchesCategory = category === 'all' || product.category === category;
        const matchesPopular = !popularOnly || popularProductIds.has(product.id);
        const matchesMinPrice = !hasMinPrice || product.price >= parsedMinPrice;
        const matchesMaxPrice = !hasMaxPrice || product.price <= parsedMaxPrice;
        const matchesSpecs = Object.entries(specFilters).every(([specKey, selectedValue]) => {
          if (!selectedValue) return true;
          return (product.specs?.[specKey] ?? '') === selectedValue;
        });
        return (
          matchesQuery &&
          matchesCategory &&
          matchesPopular &&
          matchesMinPrice &&
          matchesMaxPrice &&
          matchesSpecs
        );
      }),
    [products, search, category, popularOnly, popularProductIds, minPrice, maxPrice, specFilters]
  );

  useEffect(() => {
    setPage(1);
  }, [search, category, popularOnly, minPrice, maxPrice, sortBy, specFilters]);

  useEffect(() => {
    setSpecFilters({});
  }, [category]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'best_selling':
        return list.sort((a, b) => {
          const aStock = a.stock > 0 ? a.stock : Number.MAX_SAFE_INTEGER;
          const bStock = b.stock > 0 ? b.stock : Number.MAX_SAFE_INTEGER;
          return aStock - bStock || b.price - a.price;
        });
      case 'price_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      default:
        return list.sort((a, b) => b.stock * b.price - a.stock * a.price);
    }
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = sortedProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE
  );

  const marqueeProducts = useMemo(() => {
    if (products.length === 0) {
      return FALLBACK_POPULAR.map((name, index) => ({
        key: `fallback-${index}`,
        label: name,
        productId: null as string | null,
      }));
    }
    return [...products]
      .sort((a, b) => hashString(a.id) - hashString(b.id))
      .slice(0, 10)
      .map((item) => ({ key: item.id, label: item.name, productId: item.id }));
  }, [products]);

  const favoriteProducts = useMemo(
    () => [...products].sort((a, b) => hashString(a.sku) - hashString(b.sku)).slice(0, 4),
    [products]
  );

  const campaignProducts = useMemo(() => {
    const fallback = sortedProducts.slice(0, 3);
    if (fallback.length > 0) return fallback;
    return products.slice(0, 3);
  }, [sortedProducts, products]);

  const flashDeadline = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }, []);

  const flashRemaining = useMemo(() => {
    const diff = Math.max(0, flashDeadline - flashNow);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }, [flashDeadline, flashNow]);

  const flashProduct = useMemo(() => {
    if (campaignProducts.length > 0) return campaignProducts[0];
    if (sortedProducts.length > 0) return sortedProducts[0];
    return products[0] ?? null;
  }, [campaignProducts, sortedProducts, products]);

  const recentlyViewedProducts = useMemo(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      if (!Array.isArray(parsed)) return [];
      const ids = parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
      const map = products.reduce<Map<string, Product>>((acc, product) => {
        acc.set(product.id, product);
        return acc;
      }, new Map<string, Product>());
      return ids
        .map((id) => map.get(id))
        .filter((item): item is Product => Boolean(item))
        .slice(0, 4);
    } catch {
      return [];
    }
  }, [products]);

  const addToCart = (product: Product) => {
    if (authenticated) {
      const numericProductId = Number(product.id);
      if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
        notifyError('Urun kimligi gecersiz.');
        return;
      }
      void (async () => {
        try {
          await cartApi.addToCart({ productId: numericProductId, quantity: 1 });
          await syncRemoteCart();
          appendAuditLog({
            action: 'add_item',
            module: 'cart',
            detail: `${product.name} added to cart`,
          });
        } catch (error: unknown) {
          notifyError(getApiErrorMessage(error, 'Sepete ekleme islemi basarisiz oldu.'));
        }
      })();
      return;
    }

    const cartItems = readCartItems();
    const existing = cartItems.find((item) => item.productId === product.id);
    const nextItems = existing
      ? cartItems.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      : [...cartItems, { productId: product.id, quantity: 1 }];

    writeGuestCart(nextItems);
    window.dispatchEvent(new Event('nogaps:cart-updated'));
    appendAuditLog({
      action: 'add_item',
      module: 'cart',
      detail: `${product.name} added to cart`,
    });
  };

  const removeFromQuickCart = (item: CartPreviewItem) => {
    if (isRemovingCartItem) return;

    if (authenticated) {
      if (!item.productId) {
        notifyError('Urun sepetten kaldirilamadi.');
        return;
      }
      void (async () => {
        setIsRemovingCartItem(item.key);
        try {
          await cartApi.removeFromCart(item.productId as number);
          await syncRemoteCart();
        } catch (error: unknown) {
          notifyError(getApiErrorMessage(error, 'Sepetten silme islemi basarisiz oldu.'));
        } finally {
          setIsRemovingCartItem(null);
        }
      })();
      return;
    }

    const nextItems = readCartItems().filter((cartItem) => cartItem.productId !== item.key);
    writeGuestCart(nextItems);
    window.dispatchEvent(new Event('nogaps:cart-updated'));
  };

  const toggleFavorite = async (product: Product) => {
    if (!authenticated) {
      notifyError('Favorilemek icin giris yapmalisiniz.');
      navigate('/login?redirect=/');
      return;
    }
    if (!isUserRole) {
      notifyError('Sadece user rolundeki hesaplar favori kullanabilir.');
      return;
    }

    const numericId = Number(product.id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      notifyError('Bu urun favori islemi icin uygun degil.');
      return;
    }
    if (favoriteBusyId === numericId) return;

    const isFavorite = favoriteProductIds.has(numericId);
    setFavoriteBusyId(numericId);
    try {
      if (isFavorite) {
        await favoritesApi.removeFavorite(numericId);
        setFavoriteProductIds((prev) => {
          const next = new Set(prev);
          next.delete(numericId);
          return next;
        });
      } else {
        await favoritesApi.addFavorite(numericId);
        setFavoriteProductIds((prev) => new Set(prev).add(numericId));
      }
      window.dispatchEvent(new Event('nogaps:favorites-updated'));
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Favori islemi basarisiz.'));
    } finally {
      setFavoriteBusyId(null);
    }
  };

  return (
    <StoreLayout
      title="Bilgisayar Ekipmanlari"
      subtitle="Yeni nesil urunleri kesfet, filtrele ve odeme adimina hizli gec."
      cartCount={cartCount}
    >
      <section className="grid gap-4 overflow-x-hidden lg:grid-cols-[240px_minmax(0,1fr)_300px] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-300">Filtreler</p>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <label className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ara</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input
                  id="shop-search"
                  name="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Urun ara"
                  className="w-full min-w-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <label className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Kategori</label>
              <select
                id="shop-category-filter"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategorySpecDefinition && (
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Alt Kategori Filtreleri
                </p>
                <div className="mt-2 space-y-2">
                  {specFilterOptions.map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-[11px] text-slate-400">{field.label}</span>
                      <select
                        value={specFilters[field.key] ?? ''}
                        onChange={(event) =>
                          setSpecFilters((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-100 outline-none"
                      >
                        <option value="">Tum</option>
                        {field.options.map((option) => (
                          <option key={`${field.key}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Populer</p>
              <button
                type="button"
                onClick={() => setPopularOnly((prev) => !prev)}
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  popularOnly
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                    : 'border-slate-700/70 text-slate-300 hover:border-brand-500/40'
                }`}
              >
                <Star size={14} />
                {popularOnly ? 'Sadece populer urunler' : 'Tum urunler'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fiyat Araligi</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  id="shop-min-price"
                  name="minPrice"
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="Min"
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-600"
                />
                <input
                  id="shop-max-price"
                  name="maxPrice"
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Max"
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-brand-300">Magaza</p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              Yeni nesil bilgisayar urunleri
            </h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-black/40 p-2.5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Populer urunler</p>
              <div className="mt-2 flex overflow-hidden">
                <div className="flex min-w-max animate-marquee-right gap-2">
                  {marqueeProducts.concat(marqueeProducts).map((item, index) => (
                    item.productId ? (
                      <Link
                        key={`${item.key}-${index}`}
                        to={`/product/${item.productId}`}
                        className="inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-brand-200 transition hover:border-brand-400/50 hover:bg-brand-500/20"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        key={`${item.key}-${index}`}
                        className="inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-brand-200"
                      >
                        {item.label}
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-sm text-slate-400">{sortedProducts.length} urun listeleniyor</p>
            <div className="inline-flex items-center gap-2">
              <label htmlFor="shop-sort-by" className="text-sm text-slate-400">
                Sort by
              </label>
              <select
                id="shop-sort-by"
                name="sortBy"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none"
              >
                <option value="recommended">Onerilen</option>
                <option value="best_selling">En cok satan</option>
                <option value="price_desc">En yuksek fiyat</option>
                <option value="price_asc">En dusuk fiyat</option>
                <option value="name_asc">A-Z</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedProducts.map((product) => (
              <article
                key={product.id}
                className="group min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-lg shadow-black/30 transition hover:-translate-y-1"
              >
                <Link to={`/product/${product.id}`} className="relative block h-44 overflow-hidden bg-slate-900">
                  <img
                    src={getProductImage(product.category, product.imageUrl)}
                    alt={product.name}
                    className="h-full w-full origin-center object-cover transition duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70 transition duration-500 group-hover:opacity-40" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-brand-300">
                    {product.category}
                  </span>
                </Link>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/product/${product.id}`}
                        className="line-clamp-1 text-base font-semibold text-white transition hover:text-brand-200"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-400">SKU: {product.sku}</p>
                    </div>
                    {authenticated && isUserRole && (
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(product)}
                        disabled={favoriteBusyId === Number(product.id)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                          favoriteProductIds.has(Number(product.id))
                            ? 'border-rose-400/60 bg-rose-500/20 text-rose-300'
                            : 'border-slate-700/80 text-slate-300 hover:border-rose-400/50 hover:text-rose-300'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        aria-label="Favori islemi"
                        title={
                          favoriteProductIds.has(Number(product.id))
                            ? 'Favorilerden kaldir'
                            : 'Favorilere ekle'
                        }
                      >
                        <Heart size={15} fill={favoriteProductIds.has(Number(product.id)) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold text-white">
                      TRY {product.price.toLocaleString('tr-TR')}
                    </p>
                    <div className="rounded-full bg-slate-900/80 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                      {product.stock > 0 ? `${product.stock} adet` : 'Tukendi'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-slate-700/70"
                    >
                      <Plus size={14} />
                      Sepete ekle
                    </button>
                    <Link
                      to={`/product/${product.id}`}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-500/40 hover:text-white"
                    >
                      Incele
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {paginatedProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-950/60 p-10 text-center text-slate-400">
                Aradiginiz urun bulunamadi.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Onceki
            </button>
            <span className="text-xs text-slate-300">
              Sayfa {page} / {totalPages} | Her sayfada 12 urun
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-base font-semibold text-white">Bugunun Favorileri</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {favoriteProducts.map((product) => (
                <div
                  key={`favorite-${product.id}`}
                  className="rounded-xl border border-slate-800 bg-black/40 p-3"
                >
                  <p className="text-base font-semibold text-slate-100">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-400">TRY {product.price.toLocaleString('tr-TR')}</p>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    <Plus size={14} />
                    Sepete ekle
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-800 bg-gradient-to-b from-emerald-500/20 via-slate-900/85 to-black/90 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Firsat Urun</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Indirim Kampanyasi</h3>
          <p className="mt-2 text-sm text-slate-300">
            Secili gaming laptop, SSD ve monitorlerde sepette ekstra indirim.
          </p>
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-black/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Kod</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">FIRSAT20</p>
            <p className="mt-1 text-sm text-slate-400">31 Mayis 2026 tarihine kadar gecerli.</p>
          </div>
          <div className="mt-3 rounded-xl border border-slate-700/70 bg-black/40 p-3">
            <p className="text-xs text-slate-300">2000 TL ve uzeri siparislerde hizli kargo ucretsiz.</p>
          </div>
          {flashProduct && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Flash Firsat</p>
              <Link to={`/product/${flashProduct.id}`} className="mt-1 block text-sm font-semibold text-white hover:text-amber-100">
                {flashProduct.name}
              </Link>
              <p className="mt-1 text-xs text-slate-300">
                TRY {flashProduct.price.toLocaleString('tr-TR')} | Bugun bitiyor
              </p>
              <p className="mt-2 inline-flex rounded-lg border border-amber-400/40 bg-black/40 px-2 py-1 font-mono text-sm text-amber-200">
                {flashRemaining}
              </p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Firsat Urunleri</p>
            {campaignProducts.map((product, index) => {
              const discountRate = 10 + ((hashString(product.id) + index * 3) % 8);
              return (
                <Link
                  key={`campaign-${product.id}`}
                  to={`/product/${product.id}`}
                  className="block rounded-xl border border-emerald-400/20 bg-black/35 p-3 transition hover:border-emerald-300/50 hover:bg-black/55"
                >
                  <p className="text-base font-semibold text-slate-100">{product.name}</p>
                  <p className="mt-1 text-xs text-emerald-200">
                    TRY {product.price.toLocaleString('tr-TR')} | %{discountRate} indirim
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Son Goruntulenenler</p>
            {recentlyViewedProducts.length === 0 && (
              <p className="rounded-xl border border-slate-700/70 bg-black/35 p-3 text-xs text-slate-400">
                Henuz urun goruntulemediniz.
              </p>
            )}
            {recentlyViewedProducts.map((product) => (
              <Link
                key={`recent-${product.id}`}
                to={`/product/${product.id}`}
                className="block rounded-xl border border-slate-700/70 bg-black/35 p-3 transition hover:border-brand-500/40"
              >
                <p className="line-clamp-1 text-sm font-semibold text-slate-100">{product.name}</p>
                <p className="mt-1 text-xs text-slate-400">TRY {product.price.toLocaleString('tr-TR')}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <div className="fixed bottom-6 right-6 z-[70]">
        {isCartOpen && (
          <div className="mb-3 w-[min(32rem,calc(100vw-0.5rem))] rounded-2xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl shadow-black/50">
            <p className="text-xl font-semibold text-white">Sepetim</p>
            <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
              {isCartLoading && <p className="text-sm text-slate-500">Sepet yukleniyor...</p>}
              {!isCartLoading && cartPreview.length === 0 && (
                <p className="text-sm text-slate-500">Sepetiniz su an bos.</p>
              )}
              {cartPreview.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-black/40 p-3"
                >
                  <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-100">{item.name}</p>
                    <p className="text-sm text-slate-400">
                      {item.quantity} adet | TRY {item.unitPrice.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromQuickCart(item)}
                    disabled={isRemovingCartItem !== null}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`${item.name} urununu sepetten kaldir`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="mt-4 w-full rounded-xl bg-brand-500 px-3 py-3.5 text-base font-semibold text-white transition hover:bg-brand-400"
            >
              Odemeye gec
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCartOpen((prev) => !prev)}
          className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500 text-white shadow-xl shadow-brand-950/40 transition hover:bg-brand-400"
          aria-label="Sepeti ac"
        >
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-black px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </StoreLayout>
  );
};

