export interface AuthUser {
  userId: string;
  email: string;
  paramId: string;
  pennId?: string;
  name?: string;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface OtpRequestPayload {
  email: string;
}

export interface OtpVerifyPayload {
  email: string;
  otp: string;
}

export interface SsoLoginPayload {
  provider: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
  enn?: Record<string, unknown>;
}
