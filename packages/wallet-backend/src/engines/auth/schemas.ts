import { z } from 'zod';

export const OtpRequestSchema = z.object({
  email: z.string().email(),
  deviceId: z.string().optional(),
});

export const OtpVerifySchema = z.object({
  email: z.string().email(),
  // MED-1 fix: ENN OTPs are typically 6 digits; .length(8) would reject standard 6-digit OTPs.
  // Use min/max range to accommodate both 6-digit and 8-char variants.
  otp: z.string().min(4).max(8).regex(/^[a-zA-Z0-9]+$/, 'OTP must be alphanumeric'),
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
