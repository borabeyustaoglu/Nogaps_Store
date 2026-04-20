# InOut Frontend UI Taslagi

Bu dokuman login-logout-register akisina uygun ilk arayuz taslagidir.
Amaç: once net bir tasarim iskeleti cikarip sonra hizli implementasyona gecmek.

## 1) Bilgi Mimarisi

- `/login`: Kullanici girisi
- `/register`: Iki adimli kayit
- `/dashboard`: Giris sonrasi ana ekran
- `/forbidden`: Yetkisiz erisim
- `/404`: Bulunamayan sayfa

## 2) Ekran Taslaklari (Wireframe)

### Login

[Sol Panel - Marka/Hikaye] | [Sag Panel - Form]
- Logo + Kisa slogan
- Ozellik rozetleri
- Kullanici adi alani
- Sifre alani + goster/gizle
- `Giris Yap` butonu
- `Kayit Ol` yonlendirmesi

### Register

[Sol Panel - Marka/Hikaye] | [Sag Panel - 2 Adimli Form]
- Adim 1: kullanici adi, sifre, ad soyad
- Adim 2: e-posta, telefon, adres
- Adim gostergesi (1/2)
- `Geri`, `Devam Et`, `Kayit Ol` aksiyonlari

### Dashboard

[Ust Navbar]
- Sol: Logo
- Sag: Kullanici avatari + rol + cikis

[Ana Icerik]
- Karsilama mesaji
- 3 hizli kart: Urunler, Sepet, Audit Logs

## 3) Tasarim Dili

- Renk: `brand` turkuaz + koyu slate zemin
- Tipografi:
  - Baslik: `Syne`
  - Govde: `Outfit`
- Kose yaricaplari: orta-yuksek (`rounded-xl`, `rounded-2xl`)
- Buton stili: net kontrast, hover ton gecisi
- Hareket: `fade-up`, `fade-in`, `slide-right` (kisa, sade)

## 4) Bilesen Katalogu

- `AuthLayout`
  - Sol markalama paneli
  - Sag form paneli
- `InputField`
  - Label, icon, hata mesaji, sag aksiyon
- `PasswordStrength`
  - Sifre guc seviyesi
- `ProtectedRoute`
  - Giris kontrolu

## 5) Durumlar ve UX Kurallari

- Loading: butonda spinner + disabled state
- Hata: toast + alan bazli validasyon mesaji
- Basari: toast + rota yonlendirme
- Mobile:
  - Sol panel gizlenir
  - Form panel tam genislik calisir

## 6) Kodlama Sprint Plani

1. Auth ekranlarinin spacing/typography tutarliligini bitir.
2. Register adim gecislerinde mikro animasyonlari netlestir.
3. Dashboard kartlarini role gore gorunur hale getir.
4. Tum ekranlarda bosluk/kontrast/accessibility kontrolu yap.
5. Son olarak responsive test + son dokunuslar.

## 7) Kabul Kriterleri

- Login/Register/Dashboard masaustu + mobilde duzgun gorunmeli.
- Form odak/hata/loading durumlari net olmali.
- Cikis aksiyonu anlasilir ve kolay ulasilir olmali.
- Renk ve tipografi tum sayfalarda tutarli olmali.

---

Bu taslak onaylandiginda bir sonraki adim:
`Sprint 1`e gecip Login/Register ekranlarini piksel seviyesinde toparlayarak kodlamaya baslayalim.
