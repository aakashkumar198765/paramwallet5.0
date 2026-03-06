export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  paramId: string | null;
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

export interface OtpRequestResponse {
  status: string; // 'sent'
}

export interface OtpVerifyResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
  isTermsAndConditionVerified: boolean;
  user: {
    userId: string;
    email: string;
  };
  enn: {
    paramId: string;
    pennId: string;
    publicKey: string;
  };
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    userId: string;
    email: string;
    paramId: string;
  };
}

export interface Profile {
  paramId: string;
  userId: string;
  email: string;
  name: string;
  workspaces: Array<{
    subdomain: string;
    workspaceName: string;
    role: string;
  }>;
}
