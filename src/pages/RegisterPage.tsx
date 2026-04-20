import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { notifySuccess, notifyError } from '../utils/notify';
import axios from 'axios';

import { AuthLayout } from '../components/AuthLayout';
import { InputField } from '../components/InputField';
import { PasswordStrength } from '../components/PasswordStrength';
import { authApi } from '../api/auth';
import { registerSchema, type RegisterFormData } from '../types/schemas';
import { appendAuditLog } from '../utils/auditLog';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const passwordValue = watch('password', '');

  const handleNextStep = async () => {
    const valid = await trigger(['username', 'password', 'fullName']);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      appendAuditLog({
        action: 'register',
        module: 'auth',
        detail: `${data.username} registered`,
      });
      notifySuccess(res.data.message || 'Kayit basarili! Giris yapabilirsiniz.');
      navigate('/login');
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Kayit basarisiz. Lutfen tekrar deneyin.';
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-7">
        <div className="space-y-2 animate-fade-up" style={{ opacity: 0 }}>
          <h2 className="font-display text-4xl font-bold text-white">Hesap olusturun</h2>
          <p className="text-slate-300 text-base font-body">Birkac adimda uyeliginizi tamamlayin</p>
        </div>

        <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`
                flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold font-display
                transition-all duration-300
                ${
                  step === s
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : step > s
                      ? 'bg-brand-900 border border-brand-500/50 text-brand-300'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                }
              `}
              >
                {step > s ? 'OK' : s}
              </div>
              <span className={`text-sm font-body ${step === s ? 'text-slate-200' : 'text-slate-500'}`}>
                {s === 1 ? 'Hesap Bilgileri' : 'Kisisel Bilgiler'}
              </span>
              {s < 2 && <div className={`w-8 h-px transition-colors duration-300 ${step > 1 ? 'bg-brand-500/50' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            notifyError('Kayit formunda eksik veya hatali alan var.');
          })}
          className="space-y-4"
        >
          {step === 1 && (
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
              <InputField
                label="Kullanici Adi"
                type="text"
                placeholder="kullanici_adi"
                autoComplete="username"
                icon={<User size={15} />}
                error={errors.username}
                {...register('username')}
              />

              <div className="space-y-1">
                <InputField
                  label="Sifre"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="new-password"
                  icon={<Lock size={15} />}
                  error={errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-slate-500 hover:text-brand-400 transition-colors duration-150 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  {...register('password')}
                />
                <PasswordStrength password={passwordValue} />
                <p className="text-sm text-slate-400 font-body mt-1">Min. 8 karakter - 1 buyuk harf - 1 ozel karakter</p>
                <p className="text-xs text-slate-500 font-body mt-1">
                  Not: Bu adim sadece form kontroludur, henuz sunucuya istek atilmaz.
                </p>
              </div>

              <InputField
                label="Ad Soyad"
                type="text"
                placeholder="Adiniz Soyadiniz"
                autoComplete="name"
                icon={<UserPlus size={15} />}
                error={errors.fullName}
                {...register('fullName')}
              />

              <button
                type="button"
                onClick={handleNextStep}
                className="
                  w-full flex items-center justify-center gap-2 mt-2
                  bg-brand-500 hover:bg-brand-400
                  text-white font-semibold text-base
                  py-3.5 px-6 rounded-xl
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-brand-500/50
                  group
                "
              >
                <span>Devam Et</span>
                <ArrowLeft size={15} className="rotate-180 group-hover:translate-x-0.5 transition-transform duration-150" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0s', opacity: 0 }}>
              <InputField
                label="E-posta"
                type="email"
                placeholder="ornek@mail.com"
                autoComplete="email"
                icon={<Mail size={15} />}
                error={errors.email}
                {...register('email')}
              />

              <InputField
                label="Telefon Numarasi"
                type="tel"
                placeholder="+90 5XX XXX XX XX"
                autoComplete="tel"
                icon={<Phone size={15} />}
                error={errors.phoneNumber}
                {...register('phoneNumber')}
              />

              <InputField
                label="Adres"
                type="text"
                placeholder="Mahalle, Cadde, Ilce / Sehir"
                autoComplete="street-address"
                icon={<MapPin size={15} />}
                error={errors.address}
                {...register('address')}
              />

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="
                    flex-1 flex items-center justify-center gap-2
                    bg-slate-800 hover:bg-slate-700
                    border border-slate-700
                    text-slate-200 font-medium text-base
                    py-3.5 px-4 rounded-xl
                    transition-all duration-200
                    focus:outline-none
                  "
                >
                  <ArrowLeft size={14} />
                  <span>Geri</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex-[2] flex items-center justify-center gap-2
                    bg-brand-500 hover:bg-brand-400
                    disabled:bg-brand-800 disabled:cursor-not-allowed
                    text-white font-semibold text-base
                    py-3.5 px-6 rounded-xl
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-brand-500/50
                  "
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Kayit Ol</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-base text-slate-300 font-body">
          Zaten hesabin var mi?{' '}
          <Link
            to="/login"
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors duration-150 underline underline-offset-2"
          >
            Giris yapin
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
