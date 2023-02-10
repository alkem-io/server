export type ElasticResponseError = {
  meta: {
    body: {
      error: {
        reason: string;
        type: string;
        root_cause: [{ reason: string; type: string }];
      };
    };
    headers: Record<string, string>;
    meta: {
      aborted: boolean;
      attempts: number;
      connection: Record<string, unknown>;
      context: unknown;
      name: string;
      request: Record<string, unknown>;
    };
    statusCode: Record<string, unknown>;
    warnings: unknown;
  };
  name: string;
  message: string;
  stack: string;
};
