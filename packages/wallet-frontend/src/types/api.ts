export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

export interface SuccessResponse {
  success: true;
}

export interface ProfileResponse {
  userId: string;
  email: string;
  paramId: string;
  name?: string;
  workspaces?: string[];
}
