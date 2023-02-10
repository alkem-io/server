import { ErrorResponseBase } from '@elastic/elasticsearch/lib/api/types';

export const isElasticError = (error: unknown): error is ErrorResponseBase => {
  const err = error as ErrorResponseBase;
  return !!err?.status && !!err?.error && !!err?.error.type;
};
