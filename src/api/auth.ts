import axios from 'axios';
import api from './axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  MessageResponse,
  ProfileUpdateRequest,
  SendVerificationCodeRequest,
} from '../types/auth';

const shouldRetryWithForm = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const responseMessage = String(error.response?.data?.message ?? '');
  const fallbackHint = `${responseMessage} ${error.message}`.toLowerCase();
  return (
    (status === 400 || status === 422 || status === 500) &&
    /required|request parameter|missing|must not be blank/.test(fallbackHint)
  );
};

const toUrlEncoded = (data: Record<string, string>) => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    params.append(key, value);
  });
  return params.toString();
};

const toStringRecord = (data: object): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    normalized[key] = typeof value === 'string' ? value : String(value ?? '');
  });
  return normalized;
};

const postWithFallback = async <
  TResponse,
  TPayload extends object = Record<string, string>
>(
  url: string,
  data: TPayload,
  aliases?: Record<string, string[]>
) => {
  const normalizedData = toStringRecord(data);
  try {
    return await api.post<TResponse>(url, normalizedData);
  } catch (error) {
    if (!shouldRetryWithForm(error)) {
      throw error;
    }

    const attempts: Array<{ payload: unknown; headers: Record<string, string> }> = [
      {
        payload: toUrlEncoded(normalizedData),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    ];

    if (aliases) {
      const aliasPayload: Record<string, string> = { ...normalizedData };
      Object.entries(aliases).forEach(([sourceKey, aliasKeys]) => {
        const sourceValue = normalizedData[sourceKey];
        if (sourceValue == null) return;
        aliasKeys.forEach((aliasKey) => {
          aliasPayload[aliasKey] = sourceValue;
        });
      });

      attempts.push({
        payload: toUrlEncoded(aliasPayload),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const formData = new FormData();
      Object.entries(aliasPayload).forEach(([key, value]) => {
        formData.append(key, value);
      });
      attempts.push({
        payload: formData,
        headers: {},
      });
    }

    let lastError: unknown = error;
    for (const attempt of attempts) {
      try {
        return await api.post<TResponse>(url, attempt.payload, {
          headers: attempt.headers,
        });
      } catch (nextError) {
        lastError = nextError;
      }
    }
    throw lastError;
  }
};

export const authApi = {
  login: (data: LoginRequest) =>
    postWithFallback<LoginResponse, LoginRequest>('/auth/login', data, {
      username: ['userName', 'email', 'login'],
      password: ['pass', 'pwd'],
    }),

  register: (data: RegisterRequest) =>
    postWithFallback<MessageResponse, RegisterRequest>('/auth/register', data, {
      username: ['userName', 'email', 'login'],
      fullName: ['fullname', 'name'],
      phoneNumber: ['phone', 'phone_number'],
      address: ['addr'],
      password: ['pass', 'pwd'],
    }),

  logout: () =>
    api.post<MessageResponse>('/auth/logout'),

  sendProfileVerificationCode: async (data: SendVerificationCodeRequest) => {
    const aliases = {
      phoneNumber: ['phone', 'phone_number'],
      email: ['mail'],
    };

    const attempts = [
      '/auth/profile/send-verification-code',
      '/auth/send-verification-code',
      '/auth/verification/send',
    ];

    let lastError: unknown;
    for (const url of attempts) {
      try {
        return await postWithFallback<MessageResponse, SendVerificationCodeRequest>(
          url,
          data,
          aliases
        );
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  },

  updateProfile: async (data: ProfileUpdateRequest) => {
    const aliases = {
      phoneNumber: ['phone', 'phone_number'],
      password: ['newPassword', 'pass', 'pwd'],
      verificationCode: ['code', 'otp', 'verification_code'],
      email: ['mail'],
    };

    const attempts = [
      '/auth/profile/update',
      '/auth/update-profile',
      '/auth/profile',
    ];

    let lastError: unknown;
    for (const url of attempts) {
      try {
        return await postWithFallback<LoginResponse, ProfileUpdateRequest>(
          url,
          data,
          aliases
        );
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  },
};
