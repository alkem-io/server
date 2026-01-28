import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from './base.exception';

export class ForumDiscussionCategoryException extends BaseException {
  constructor(message: string, context: LogContext, code?: AlkemioErrorStatus) {
    super(
      message,
      context,
      code ?? AlkemioErrorStatus.FORUM_DISCUSSION_CATEGORY
    );
  }
}
