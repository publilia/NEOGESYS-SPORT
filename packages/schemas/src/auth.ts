import { z } from "zod";

/**
 * Schema for user login.
 */
export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
  totpCode: z.string().length(6, "Codice TOTP deve essere di 6 cifre").optional(),
});

/**
 * Schema for new user registration.
 */
export const registerSchema = z
  .object({
    email: z.string().email("Email non valida"),
    password: z
      .string()
      .min(8, "Password deve avere almeno 8 caratteri")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password deve contenere almeno una minuscola, una maiuscola e un numero",
      ),
    confirmPassword: z.string(),
    nome: z.string().min(1, "Nome obbligatorio").max(100),
    cognome: z.string().min(1, "Cognome obbligatorio").max(100),
    telefono: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

/**
 * Schema for password reset request.
 */
export const resetPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

/**
 * Schema for changing the active tenant context.
 */
export const changeTenantSchema = z.object({
  tenantId: z.string().uuid("ID tenant non valido"),
});

export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangeTenant = z.infer<typeof changeTenantSchema>;
