import { EntityManager, FindOneOptions } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { IDiscussion } from '@platform/forum-discussion/discussion.interface';

export class ForumDiscussionLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getForumDiscussionByNameIdOrFail(
    forumDiscussionNameID: string,
    options?: FindOneOptions<Discussion>
  ): Promise<IDiscussion> {
    const forumDiscussion: IDiscussion | null =
      await this.entityManager.findOne(Discussion, {
        ...options,
        where: { ...options?.where, nameID: forumDiscussionNameID },
      });
    if (!forumDiscussion)
      throw new EntityNotFoundException(
        `Unable to find Forum Discussion with NameID: ${forumDiscussionNameID}`,
        LogContext.PLATFORM_FORUM
      );
    return forumDiscussion;
  }
}
