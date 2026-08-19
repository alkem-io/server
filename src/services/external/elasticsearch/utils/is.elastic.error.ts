import { estypes } from '@elastic/elasticsearch';

export const isElasticError = (
  error: unknown
): error is estypes.ErrorResponseBase => {
  const err = error as estypes.ErrorResponseBase;
  return !!err?.status && !!err?.error && !!err?.error.type;
};
