import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { IDocument } from './document.interface';

@Resolver(() => IDocument)
export class DocumentResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userService: UserService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Document',
  })
  async createdBy(@Parent() document: IDocument): Promise<IUser | null> {
    const createdBy = document.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await this.userService.getUserOrFail(createdBy);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving storage document '${document.id}'`,
          LogContext.CALENDAR
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
