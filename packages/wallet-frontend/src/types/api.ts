export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  documents?: T[];
  records?: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}
