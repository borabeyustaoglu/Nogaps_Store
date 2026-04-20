import axios from 'axios';

const stringifyData = (data: unknown): string => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const message =
      record.message || record.error || record.detail || record.title || record.path;
    if (typeof message === 'string' && message.trim().length > 0) return message;
    try {
      return JSON.stringify(data);
    } catch {
      return '';
    }
  }
  return '';
};

const statusMessage = (status?: number): string => {
  switch (status) {
    case 400:
      return 'Gonderilen bilgiler gecersiz. Lutfen alanlari kontrol edin.';
    case 401:
      return 'Oturumunuz dogrulanamadi. Lutfen tekrar giris yapin.';
    case 403:
      return 'Bu islem icin yetkiniz bulunmuyor.';
    case 404:
      return 'Istenen kayit bulunamadi.';
    case 409:
      return 'Islem mevcut kayitlarla cakistigi icin tamamlanamadi.';
    case 422:
      return 'Girilen bilgiler dogrulanamadi. Lutfen duzeltip tekrar deneyin.';
    case 429:
      return 'Cok fazla istek gonderildi. Kisa bir sure sonra tekrar deneyin.';
    case 500:
      return 'Sunucuda beklenmeyen bir hata olustu. Lutfen tekrar deneyin.';
    case 502:
    case 503:
    case 504:
      return 'Servis su anda gecici olarak ulasilamiyor. Lutfen biraz sonra tekrar deneyin.';
    default:
      return 'Islem su anda tamamlanamadi. Lutfen tekrar deneyin.';
  }
};

const isMeaningfulServerMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  return !(
    normalized.includes('request failed with status code') ||
    normalized.includes('network error') ||
    normalized.includes('failed to fetch') ||
    normalized === '[object object]'
  );
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback || 'Islem su anda tamamlanamadi.';

  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Sunucu yanit vermekte gecikti. Lutfen tekrar deneyin.';
    }
    return 'Baglanti hatasi olustu. Internet baglantinizi kontrol edip tekrar deneyin.';
  }

  const status = error.response?.status;
  const serverMessage = stringifyData(error.response?.data);

  if (isMeaningfulServerMessage(serverMessage)) {
    return serverMessage;
  }

  if (status) {
    return statusMessage(status);
  }

  return fallback || 'Islem su anda tamamlanamadi.';
};
