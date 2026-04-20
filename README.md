# InOut Frontend

Spring Boot backend'i için React + TypeScript arayüzü.

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.  
Backend'in `http://localhost:8080` adresinde çalışıyor olması gerekir.

## API Proxy

`vite.config.ts` dosyasında `/api` istekleri otomatik olarak `http://localhost:8080` adresine yönlendirilir.  
Backend adresiniz farklıysa `vite.config.ts` içindeki `target` değerini güncelleyin.

## Proje Yapısı

```
src/
├── api/
│   ├── axios.ts          # Axios instance + 401 interceptor
│   └── auth.ts           # login / register / logout fonksiyonları
├── components/
│   ├── AuthLayout.tsx    # Sol panel + sağ form split layout
│   ├── InputField.tsx    # Yeniden kullanılabilir input bileşeni
│   ├── PasswordStrength.tsx  # Şifre gücü göstergesi
│   └── ProtectedRoute.tsx    # Auth guard
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx  # 2 adımlı kayıt formu
│   ├── DashboardPage.tsx
│   ├── NotFoundPage.tsx
│   └── ForbiddenPage.tsx
├── router/
│   └── index.tsx         # Route tanımları
├── store/
│   └── authStore.ts      # Zustand auth store (localStorage persist)
└── types/
    ├── auth.ts           # TypeScript interface'leri
    └── schemas.ts        # Zod validasyon şemaları
```

## Şifre Kuralları

Backend ile birebir eşleşen validasyon:
- Minimum 8 karakter
- En az 1 büyük harf
- En az 1 özel karakter

## Sonraki Adımlar

Aşağıdaki sayfalar sırayla eklenecek:
- `/products` — Ürün CRUD yönetimi (ADMIN)
- `/cart` — Sepet yönetimi (USER)
- `/audit-logs` — İşlem geçmişi (ADMIN)
