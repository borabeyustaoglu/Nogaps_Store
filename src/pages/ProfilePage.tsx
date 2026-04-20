import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { notifySuccess, notifyError } from '../utils/notify';
import axios from 'axios';

import { AppShell } from '../components/AppShell';
import { InputField } from '../components/InputField';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { appendAuditLog } from '../utils/auditLog';
import { normalizeRole } from '../utils/roles';
import {
  profileUpdateSchema,
  type ProfileUpdateFormData,
} from '../types/schemas';

export const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const role = normalizeRole(user?.role);
  const canEditProfile = role === 'user';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onTouched',
    defaultValues: {
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      password: '',
      verificationCode: '',
    },
  });

  const handleSendVerificationCode = async () => {
    if (!user || !canEditProfile) return;
    setIsSendingCode(true);
    try {
      const res = await authApi.sendProfileVerificationCode({
        email: user.email,
        phoneNumber: user.phoneNumber,
      });
      notifySuccess(res.data.message || 'Dogrulama kodu gonderildi.');
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Kod gonderimi basarisiz oldu.';
      notifyError(message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const onSubmit = async (data: ProfileUpdateFormData) => {
    if (!user || !canEditProfile) return;
    setIsSubmitting(true);
    try {
      const res = await authApi.updateProfile({
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password || undefined,
        verificationCode: data.verificationCode,
      });

      setUser({
        ...user,
        ...res.data,
      });

      appendAuditLog({
        action: 'profile_update',
        module: 'auth',
        detail: `${user.username} updated profile credentials`,
      });

      notifySuccess('Bilgileriniz guncellendi ve veritabanina kaydedildi.');
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Profil guncellenemedi. Bilgileri ve dogrulama kodunu kontrol edin.';
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Profil Ayarlari"
      subtitle={
        canEditProfile
          ? 'Email, telefon ve sifrenizi dogrulama kodu ile guncelleyebilirsiniz.'
          : 'Sadece user rolündeki kullanıcılar bilgilerini güncelleyebilir.'
      }
    >
      <div className="max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-brand-300">Hesap Bilgisi</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              {user?.fullName ?? 'Kullanici'}
            </h2>
            <p className="text-sm text-slate-400">@{user?.username ?? '-'}</p>
            {!canEditProfile && (
              <p className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
                Manager ve administrator rolleri profil bilgilerini görebilir; güncelleme yapamaz.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSendVerificationCode}
            disabled={isSendingCode || !user || !canEditProfile}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingCode ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Kod gonderiliyor...
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Dogrulama kodu gonder
              </>
            )}
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            notifyError('Formdaki alanlari kontrol edin.');
          })}
          className="space-y-4"
        >
          <InputField
            label="E-posta"
            type="email"
            autoComplete="email"
            icon={<Mail size={15} />}
            error={errors.email}
            disabled={!canEditProfile}
            {...register('email')}
          />

          <InputField
            label="Telefon Numarasi"
            type="tel"
            autoComplete="tel"
            icon={<Phone size={15} />}
            error={errors.phoneNumber}
            disabled={!canEditProfile}
            {...register('phoneNumber')}
          />

          <InputField
            label="Yeni Sifre (opsiyonel)"
            type="password"
            autoComplete="new-password"
            icon={<Lock size={15} />}
            error={errors.password}
            disabled={!canEditProfile}
            {...register('password')}
          />

          <InputField
            label="Dogrulama Kodu"
            type="text"
            inputMode="numeric"
            icon={<ShieldCheck size={15} />}
            error={errors.verificationCode}
            disabled={!canEditProfile}
            {...register('verificationCode')}
          />

          <button
            type="submit"
            disabled={isSubmitting || !user || !canEditProfile}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-brand-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guncelleniyor...
              </>
            ) : (
              'Bilgileri Guncelle'
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
};
