import { ElasticResponseError } from '../types';

export const isElasticResponseError = (
  error: unknown
): error is ElasticResponseError => {
  const e = error as ElasticResponseError;
  return !!e.meta && !!e.stack && !!e.message;
};
