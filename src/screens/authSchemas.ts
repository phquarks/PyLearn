import { z } from 'zod';

export const authFormSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export const resetPasswordSchema = z.object({
  email: z.email('Enter a valid email address.'),
});

export type AuthFormValues = z.infer<typeof authFormSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
