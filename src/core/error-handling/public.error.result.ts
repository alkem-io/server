import { AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import {
  computeNumericCode,
  getMetadataForStatus,
} from '@common/exceptions/error.status.metadata';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { randomUUID } from 'crypto';
import { isErrorResponseDebugEnabled } from './error.response.debug';

export const NEUTRAL_ERROR_MESSAGE =
  'This is not available. It may not exist, or you may not have access to it.';

export const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal Server Error';

/** Statuses that reach a caller as the one neutral outcome. */
const NEUTRAL_STATUSES: ReadonlySet<AlkemioErrorStatus> = new Set([
  AlkemioErrorStatus.ENTITY_NOT_FOUND,
  AlkemioErrorStatus.FORBIDDEN,
  AlkemioErrorStatus.FORBIDDEN_POLICY,
]);

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export interface PublicErrorResult {
  code: AlkemioErrorStatus;
  numericCode: number;
  userMessage: string;
  message: string;
  errorId: string;
}

export interface ErrorLogEntry {
  errorId: string;
  exceptionName: string;
  code?: AlkemioErrorStatus;
  privilege?: string;
  policyId?: string;
}

const withoutUuids = (message: string): string =>
  message
    .replace(UUID_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const resultFor = (
  code: AlkemioErrorStatus,
  message: string,
  errorId: string
): PublicErrorResult => {
  const metadata = getMetadataForStatus(code);
  return {
    code,
    numericCode: computeNumericCode(metadata),
    userMessage: metadata.userMessage,
    message,
    errorId,
  };
};

/**
 * The one public projection of a caught error, used by every place that
 * answers a caller. A non-Alkemio error gets a new errorId on every call, so
 * a caller projects once and uses that result for both the log and the answer.
 */
export const toPublicErrorResult = (error: unknown): PublicErrorResult => {
  const isAlkemio = error instanceof BaseException;
  const code = (error as { code?: AlkemioErrorStatus } | null | undefined)
    ?.code;
  if (code !== undefined && NEUTRAL_STATUSES.has(code)) {
    return resultFor(
      AlkemioErrorStatus.FORBIDDEN_POLICY,
      NEUTRAL_ERROR_MESSAGE,
      isAlkemio ? error.errorId : randomUUID()
    );
  }
  if (!isAlkemio) {
    return resultFor(
      AlkemioErrorStatus.UNSPECIFIED,
      INTERNAL_SERVER_ERROR_MESSAGE,
      randomUUID()
    );
  }
  return resultFor(error.code, withoutUuids(error.message), error.errorId);
};

/**
 * Named fields of a caught error for a log entry. Reads properties by name and
 * never the message, details, cause or stack, which can repeat caller input.
 */
export const toErrorLogEntry = (
  error: unknown,
  errorId: string
): ErrorLogEntry => {
  if (!(error instanceof Error)) {
    return { errorId, exceptionName: typeof error };
  }
  const entry: ErrorLogEntry = {
    errorId,
    exceptionName: error.constructor.name,
  };
  if (error instanceof BaseException) {
    entry.code = error.code;
  }
  if (error instanceof ForbiddenAuthorizationPolicyException) {
    entry.privilege = error.checkedPrivilege;
    entry.policyId = error.authPolicyId;
  }
  return entry;
};

/** The MCP failure text: `[<code>] <message> errorId=<id>`. */
export const toMcpErrorText = (
  result: PublicErrorResult,
  original: unknown
): string => {
  const text = `[${result.code}] ${result.message} errorId=${result.errorId}`;
  if (!isErrorResponseDebugEnabled()) {
    return text;
  }
  const detail =
    original instanceof Error ? original.message : String(original);
  return `${text} detail=${detail}`;
};
