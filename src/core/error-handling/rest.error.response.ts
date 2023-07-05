export interface RestErrorResponse {
  statusCode: number;
  timestamp: string;
  message: string;
  stack?: string;
}
