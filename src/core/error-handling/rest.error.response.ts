export interface RestErrorResponse {
  statusCode: number;
  code?: string;
  timestamp: string;
  message: string;
  stack?: string;
}
