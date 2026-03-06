export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  paramId: string | null;
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

export interface OtpRequestResponse {
  success: boolean;
}

export interface OtpVerifyResponse {
  token: string;
  refreshToken: string;
  paramId: string;
  userId: string;
  email: string;
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
