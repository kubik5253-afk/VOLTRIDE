import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя должно содержать минимум 2 символа").max(80),
  email: z.string().trim().email("Укажите корректный email").max(190).transform((v) => v.toLowerCase()),
  password: z.string()
    .min(10, "Пароль должен содержать минимум 10 символов")
    .max(72, "Пароль слишком длинный")
    .regex(/[a-z]/, "Добавьте строчную латинскую букву")
    .regex(/[A-Z]/, "Добавьте заглавную латинскую букву")
    .regex(/[0-9]/, "Добавьте цифру")
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(190).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72)
});

export const topupSchema = z.object({
  amount: z.number().finite().positive().max(90071992547409).refine(value => Number.isSafeInteger(Math.round(value * 100)), "Сумма слишком большая")
});

export const fineSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().min(100).max(100000),
  reason: z.string().trim().min(5).max(500)
});

export const messageSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(3000)
});
