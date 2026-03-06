import { z } from 'zod';

export const OtpRequestSchema = z.object({
  email: z.string().email(),
});

export const OtpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(10),
});

export const SsoLoginSchema = z.object({
  code: z.string().min(1),
  verifierId: z.string().min(1).optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().uuid(),
  paramId: z.string().min(1),
});

export const LogoutSchema = z.object({
  // paramId from header, token from Authorization
});

export const AddAppSchema = z.object({
  subdomain: z.string().min(1),
  exchangeParamId: z.string().min(1),
});

export const DomainRegisterSchema = z.object({
  email: z.string().email(),
  subdomain: z.string().min(1),
  orgName: z.string().min(1).optional(),
});

export type OtpRequestBody = z.infer<typeof OtpRequestSchema>;
export type OtpVerifyBody = z.infer<typeof OtpVerifySchema>;
export type SsoLoginBody = z.infer<typeof SsoLoginSchema>;
export type RefreshTokenBody = z.infer<typeof RefreshTokenSchema>;
export type AddAppBody = z.infer<typeof AddAppSchema>;
export type DomainRegisterBody = z.infer<typeof DomainRegisterSchema>;
