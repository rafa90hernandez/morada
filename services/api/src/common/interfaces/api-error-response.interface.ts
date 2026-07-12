export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  timestamp: string;
  path: string;
}
