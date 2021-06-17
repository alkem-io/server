import { LogContext, CherrytwistErrorStatus } from '@common/enums';
import { BaseException } from '@common/exceptions';

export class EntityNotFoundException extends BaseException {
  constructor(
    error: string,
    context: LogContext,
    code?: CherrytwistErrorStatus
  ) {
    super(error, context, code ?? CherrytwistErrorStatus.ENTITY_NOT_FOUND);
  }
}
