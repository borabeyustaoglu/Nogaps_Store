import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'En az 8 karakter olmali')
  .regex(/[A-Z]/, 'En az 1 buyuk harf icermeli')
  .regex(/[^a-zA-Z0-9]/, 'En az 1 ozel karakter icermeli');

export const loginSchema = z.object({
  username: z.string().min(1, 'Kullanici adi bos olamaz'),
  // Login tarafinda sadece dolu olmasi yeterli.
  password: z.string().min(1, 'Sifre bos olamaz'),
});

export const registerSchema = z.object({
  username: z.string().min(1, 'Kullanici adi bos olamaz'),
  password: passwordSchema,
  fullName: z.string().min(1, 'Ad soyad bos olamaz'),
  email: z.string().email('Gecerli bir e-posta giriniz'),
  phoneNumber: z.string().min(1, 'Telefon numarasi bos olamaz'),
  address: z.string().min(1, 'Adres bos olamaz'),
});

export const profileUpdateSchema = z.object({
  email: z.string().email('Gecerli bir e-posta giriniz'),
  phoneNumber: z.string().min(1, 'Telefon numarasi bos olamaz'),
  password: z
    .string()
    .optional()
    .refine(
      (value) => !value || passwordSchema.safeParse(value).success,
      'Sifre bos birakilabilir. Doldurursaniz en az 8 karakter, 1 buyuk harf ve 1 ozel karakter olmali'
    ),
  verificationCode: z
    .string()
    .min(4, 'Dogrulama kodu en az 4 karakter olmali'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
