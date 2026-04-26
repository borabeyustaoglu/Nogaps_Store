import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { notifyError } from '../utils/notify';
import axios from 'axios';

import { AuthLayout } from '../components/AuthLayout';
import { InputField } from '../components/InputField';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { loginSchema, type LoginFormData } from '../types/schemas';
import { appendAuditLog } from '../utils/auditLog';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      setUser({ ...res.data, username: data.username });
      appendAuditLog({
        action: 'login',
        module: 'auth',
        detail: `${data.username} logged in as ${res.data.role}`,
      });
      const redirectTo = searchParams.get('redirect');
      navigate(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard');
    } catch (err: unknown) {
      let message = 'Kullanici adi veya sifre hatali.';
      if (axios.isAxiosError(err)) {
        const backendMessage =
          typeof err.response?.data?.message === 'string' ? err.response.data.message : '';
        const normalized = backendMessage.toLowerCase();
        const isPasswordPolicyNoise =
          normalized.includes('en az 8 karakter') ||
          normalized.includes('buyuk harf') ||
          normalized.includes('ozel karakter') ||
          normalized.includes('sifre en az');
        if (!isPasswordPolicyNoise && backendMessage.trim().length > 0 && err.response?.status !== 401) {
          message = backendMessage;
        }
      }
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: '0s', opacity: 0 }}>
          <h2 className="font-display text-4xl font-bold text-white">Tekrar hos geldiniz</h2>
          <p className="text-slate-300 text-base font-body">Hesabiniza giris yapin</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            notifyError('Formda eksik veya hatali alan var. Lutfen alanlari kontrol edin.');
          })}
          className="space-y-5 animate-fade-up"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
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
              autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full flex items-center justify-center gap-2
              bg-brand-500 hover:bg-brand-400
              disabled:bg-brand-800 disabled:cursor-not-allowed
              text-white font-semibold text-base
              py-3.5 px-6 rounded-xl
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-brand-500/50
              group
            "
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Giris yapiliyor...</span>
              </>
            ) : (
              <>
                <span>Giris Yap</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600 font-body">veya</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <p className="text-center text-base text-slate-300 font-body animate-fade-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
          Hesabiniz yok mu?{' '}
          <Link
            to="/register"
            className="text-brand-400 hover:text-brand-300 font-medium transition-colors duration-150 underline underline-offset-2"
          >
            Kayit olun
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
