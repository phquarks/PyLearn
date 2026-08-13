import { z } from 'zod';

export const authFormSchema = z.object({
  email: z.email('Введите корректный email.'),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов.'),
});

export const resetPasswordSchema = z.object({
  email: z.email('Введите корректный email.'),
});

export type AuthFormValues = z.infer<typeof authFormSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
