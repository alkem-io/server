import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { BaseException } from './base.exception';

/**
 * Thrown by `adminForumRemoveDiscussionCategory` when the requested category
 * still holds at least one Discussion. Deliberately a distinct code from
 * `ForumDiscussionCategoryException` so ops tooling can tell "category not
 * allowed" apart from "category not empty".
 */
export class ForumDiscussionCategoryNotEmptyException extends BaseException {
  constructor(category: ForumDiscussionCategory, remainingPostCount: number) {
    super(
      `Cannot remove discussion category '${category}': ${remainingPostCount} post(s) still carry it`,
      LogContext.PLATFORM_FORUM,
      AlkemioErrorStatus.FORUM_DISCUSSION_CATEGORY_NOT_EMPTY,
      { category, remainingPostCount }
    );
  }
}
