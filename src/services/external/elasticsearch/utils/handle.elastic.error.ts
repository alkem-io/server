import { randomUUID } from 'crypto';
import { isElasticResponseError } from './is.elastic.response.error';
import { isElasticError } from './is.elastic.error';

export type HandledElasticError = {
  message: string;
  uuid: string;
  name?: string;
  status?: number;
};

const UNKNOWN_STATUS = -1;

export const handleElasticError = (error: unknown): HandledElasticError => {
  const errorId = randomUUID();

  if (isElasticResponseError(error)) {
    // not really how to handle multiple status codes
    const status = Number(
      Object.keys(error.meta.statusCode)?.[0] ?? UNKNOWN_STATUS
    );
    return {
      message: error.message,
      uuid: errorId,
      name: error.name,
      status,
    };
  } else if (isElasticError(error)) {
    return {
      message: error.error.type,
      uuid: errorId,
      name: 'ErrorResponseBase',
      status: error.status,
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      uuid: errorId,
      name: error.name,
    };
  } else {
    return {
      message: String(error),
      uuid: errorId,
    };
  }
};
