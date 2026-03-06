import { z } from 'zod';

export const OtpRequestSchema = z.object({
  email: z.string().email(),
  deviceId: z.string().optional(),
});

export const OtpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
  deviceId: z.string().optional(),
});

export const SsoVerifySchema = z.object({
  code: z.string().min(1),
  deviceId: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().uuid(),
});

export const AddAppSchema = z.object({
  appId: z.string().min(1),
  publicKey: z.string().min(1),
  keystoreData: z.record(z.unknown()).optional(),
});

export const DomainRegisterSchema = z.object({
  email: z.string().email(),
  subdomain: z.string().min(3).max(63),
  orgName: z.string().min(1).optional(),
});

export type OtpRequestInput = z.infer<typeof OtpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>;
export type SsoVerifyInput = z.infer<typeof SsoVerifySchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type AddAppInput = z.infer<typeof AddAppSchema>;
export type DomainRegisterInput = z.infer<typeof DomainRegisterSchema>;
