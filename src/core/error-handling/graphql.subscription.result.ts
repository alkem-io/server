import { LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { LoggerService } from '@nestjs/common';
import { ExecutionResult, GraphQLError, Kind } from 'graphql';
import { toPublicGraphQLError } from './graphql.exception.filter';
import { toErrorLogEntry } from './public.error.result';

/**
 * An error raised while an event of an open subscription is resolved does not
 * pass the exception filter. Each such error is logged and replaced by its
 * public projection, keeping its `path` and `locations`. Errors the filter
 * already projected, and errors GraphQL raised itself, are left as they are.
 */
export const toPublicSubscriptionResult = <
  T extends Pick<ExecutionResult, 'errors'>,
>(
  result: T,
  logger: LoggerService,
  actorID: string | undefined
): T => {
  if (!result.errors?.length) return result;
  const errors = result.errors.map(error => {
    const original = error.originalError;
    const raw =
      original instanceof BaseException ||
      (original !== undefined && !(original instanceof GraphQLError));
    if (!raw) return error;

    const projected = toPublicGraphQLError(original);
    const node = error.nodes?.[0];
    // The schema name, never the alias the caller's document chose.
    const field = node?.kind === Kind.FIELD ? node.name.value : undefined;
    logger.error(
      {
        ...toErrorLogEntry(original, String(projected.extensions.errorId)),
        operation: 'subscription event',
        ...(field ? { field } : {}),
        actorID,
      },
      undefined,
      LogContext.SUBSCRIPTIONS
    );
    return new GraphQLError(projected.message, {
      nodes: error.nodes,
      path: error.path,
      extensions: projected.extensions,
    });
  });
  return { ...result, errors };
};
