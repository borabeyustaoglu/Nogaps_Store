import { STORAGE_KEYS } from '../constants/storage';
import type { Product } from '../types/product';

const STORAGE_KEY = STORAGE_KEYS.products;
const STORAGE_VERSION_KEY = `${STORAGE_KEYS.products}:version`;
export const PRODUCT_DATA_VERSION = 'computer-store-v2';

export const seedProducts: Product[] = [
  {
    id: 'pc-001',
    name: 'RTX 4070 Super 12GB',
    sku: 'GPU-RTX4070S',
    category: 'Graphics Cards',
    price: 26999,
    stock: 7,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-002',
    name: 'Intel Core i7 14700K',
    sku: 'CPU-I7-14700K',
    category: 'Processors',
    price: 15899,
    stock: 12,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1555617778-02518510b9fa?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-003',
    name: 'Samsung 990 Pro 2TB NVMe',
    sku: 'SSD-990PRO-2TB',
    category: 'Storage',
    price: 7199,
    stock: 18,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-004',
    name: 'Corsair 32GB DDR5 6000MHz',
    sku: 'RAM-DDR5-32G',
    category: 'Memory',
    price: 4899,
    stock: 15,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-005',
    name: 'ASUS TUF B760M-PLUS WIFI',
    sku: 'MB-B760M-TUF',
    category: 'Motherboards',
    price: 6899,
    stock: 9,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-006',
    name: 'MSI 27 inch 165Hz Gaming Monitor',
    sku: 'MON-27-165HZ',
    category: 'Displays',
    price: 8399,
    stock: 6,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-007',
    name: 'Logitech G Pro X Superlight 2',
    sku: 'MOUSE-GPROX2',
    category: 'Peripherals',
    price: 5299,
    stock: 21,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1613141411244-0e4ac259d217?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-008',
    name: 'SteelSeries Apex Pro TKL',
    sku: 'KB-APEXPROTKL',
    category: 'Peripherals',
    price: 6899,
    stock: 14,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-009',
    name: 'HyperX Cloud III Wireless',
    sku: 'HEADSET-CLOUD3W',
    category: 'Audio',
    price: 4799,
    stock: 19,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-010',
    name: 'NZXT H7 Flow RGB',
    sku: 'CASE-H7FLOWRGB',
    category: 'PC Cases',
    price: 5999,
    stock: 11,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-011',
    name: 'Corsair RM850x 850W Gold',
    sku: 'PSU-RM850X',
    category: 'Power Supplies',
    price: 5699,
    stock: 16,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1624705002806-5d72df19c3f2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pc-012',
    name: 'Arctic Liquid Freezer III 360',
    sku: 'COOLER-LF3-360',
    category: 'Cooling',
    price: 6499,
    stock: 13,
    updatedAt: new Date().toISOString(),
    imageUrl:
      'https://images.unsplash.com/photo-1587202372616-b43abea06c2a?auto=format&fit=crop&w=900&q=80',
  },
];

const mergeWithSeedProducts = (products: Product[]) => {
  const map = new Map(products.map((product) => [product.id, product]));
  seedProducts.forEach((seed) => {
    if (!map.has(seed.id)) {
      map.set(seed.id, seed);
    }
  });
  return Array.from(map.values());
};

export const readProductsFromStorage = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProducts));
      localStorage.setItem(STORAGE_VERSION_KEY, PRODUCT_DATA_VERSION);
      return seedProducts;
    }

    const parsed = JSON.parse(raw) as Product[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProducts));
      localStorage.setItem(STORAGE_VERSION_KEY, PRODUCT_DATA_VERSION);
      return seedProducts;
    }

    if (currentVersion !== PRODUCT_DATA_VERSION) {
      const merged = mergeWithSeedProducts(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      localStorage.setItem(STORAGE_VERSION_KEY, PRODUCT_DATA_VERSION);
      return merged;
    }

    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedProducts));
    localStorage.setItem(STORAGE_VERSION_KEY, PRODUCT_DATA_VERSION);
    return seedProducts;
  }
};

export const persistProductsToStorage = (products: Product[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};
