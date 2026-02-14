import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, LoggerService } from '@nestjs/common';
import { discussions } from '@platform/forum-discussion/discussion.schema';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export class ForumDiscussionLookupService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getForumDiscussionByNameIdOrFail(
    forumDiscussionNameID: string,
    options?: { relations?: Record<string, boolean> }
  ): Promise<IDiscussion> {
    const with_ = options?.relations
      ? Object.fromEntries(
          Object.entries(options.relations).map(([key, value]) => [key, value])
        )
      : undefined;

    const forumDiscussion = await this.db.query.discussions.findFirst({
      where: eq(discussions.nameID, forumDiscussionNameID),
      with: with_ as any,
    });
    if (!forumDiscussion)
      throw new EntityNotFoundException(
        `Unable to find Forum Discussion with NameID: ${forumDiscussionNameID}`,
        LogContext.PLATFORM_FORUM
      );
    return forumDiscussion as unknown as IDiscussion;
  }
}
