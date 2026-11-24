import { BaseException } from '@common/exceptions/base.exception';
import { CalloutFormErrorCode } from '@domain/collaboration/callout-form/callout.form.error.codes';
import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { isErrorResponseDebugEnabled } from './error.response.debug';
import { toPublicErrorResult } from './public.error.result';

const FORM_ERROR_CODES: ReadonlySet<string> = new Set(
  Object.values(CalloutFormErrorCode)
);

/**
 * Form reason codes (and the question ids to highlight) are the only details
 * that survive sanitisation: the code must be one of the known stable values
 * and the ids must be plain strings, so nothing else in `details` can leak.
 */
const pickPublicFormDetails = (
  details: BaseException['details']
): { code: string; questionIDs?: string[] } | undefined => {
  const code = details?.code;
  if (typeof code !== 'string' || !FORM_ERROR_CODES.has(code)) {
    return undefined;
  }
  const questionIDs = details?.questionIDs;
  if (
    Array.isArray(questionIDs) &&
    questionIDs.every(id => typeof id === 'string')
  ) {
    return { code, questionIDs };
  }
  return { code };
};

/**
 * Of the caught exception's own extensions only the transport status and the
 * authentication reason code pass, read by name: Apollo consumes `http` to set
 * the HTTP status and never serialises it, and clients branch on `error_code`.
 */
const pickTransportExtensions = (
  exception: unknown
): { http?: { status: number }; error_code?: string } => {
  const extensions =
    exception instanceof GraphQLError
      ? (exception.extensions as Record<string, any>)
      : undefined;
  const status = extensions?.http?.status;
  const errorCode = extensions?.error_code;
  return {
    ...(typeof status === 'number' ? { http: { status } } : {}),
    ...(typeof errorCode === 'string' ? { error_code: errorCode } : {}),
  };
};

/** The one public GraphQL error for a caught exception. */
export const toPublicGraphQLError = (exception: unknown): GraphQLError => {
  const { message, ...publicResult } = toPublicErrorResult(exception);
  const details =
    exception instanceof BaseException ? exception.details : undefined;

  if (!isErrorResponseDebugEnabled()) {
    const publicDetails = pickPublicFormDetails(details);
    return new GraphQLError(message, {
      extensions: {
        ...publicResult,
        ...(publicDetails ? { details: publicDetails } : {}),
        ...pickTransportExtensions(exception),
      },
    });
  }

  // Passing the original keeps its stack on the error Apollo formats.
  const original = exception instanceof Error ? exception : undefined;
  return new GraphQLError(message, {
    originalError: original,
    extensions: {
      ...publicResult,
      ...(details ? { details } : {}),
      ...pickTransportExtensions(exception),
      stacktrace: original?.stack?.split('\n'),
    },
  });
};

@Catch(GraphQLError)
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: BaseException, host: ArgumentsHost) {
    const httpArguments = host.switchToHttp();
    const ctx = httpArguments.getNext<IGraphQLContext>();
    const userID =
      exception.details?.userId ?? ctx?.req?.user?.actorID ?? 'unknown';
    exception.details = {
      ...exception.details,
      userId: userID,
    };
    // One projection per failure: the log and the answer carry the same errorId.
    const result = toPublicGraphQLError(exception);
    const loggableException = {
      ...exception,
      stack: String(exception.stack),
      extensions: undefined, // we do not need it
      errorId: result.extensions.errorId,
    };
    this.logger.error(loggableException);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    return result;
  }
}
