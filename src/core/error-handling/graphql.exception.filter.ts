import { BaseException } from '@common/exceptions/base.exception';
import { CalloutFormErrorCode } from '@domain/collaboration/callout-form/callout.form.error.codes';
import { ArgumentsHost, Catch, Inject, LoggerService } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    const loggableException = {
      ...exception,
      stack: String(exception.stack),
      extensions: undefined, // we do not need it
    };
    this.logger.error(loggableException);
    // something needs to be returned so the default ExceptionsHandler is not triggered
    if (process.env.NODE_ENV === 'production') {
      // return a new error with only the message and the id
      // that way we are not exposing any internal information;
      // the only exception is the allow-listed Form reason code
      const publicDetails = pickPublicFormDetails(exception.details);
      return new GraphQLError(exception.message, {
        extensions: {
          errorId: exception.errorId,
          code: exception.code,
          ...(publicDetails ? { details: publicDetails } : {}),
        },
      });
    }
    // if not in PROD, return everything
    return exception;
  }
}
