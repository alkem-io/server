import { LogContext } from '@common/enums/logging.context';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CollaboraDocument } from './collabora.document.entity';
import { ICollaboraDocument } from './collabora.document.interface';

@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this CollaboraDocument.',
  })
  async profile(
    @Parent() collaboraDocument: ICollaboraDocument,
    @Loader(ProfileLoaderCreator, { parentClassRef: CollaboraDocument })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(collaboraDocument.id);
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this CollaboraDocument.',
  })
  async createdBy(
    @Parent() collaboraDocument: ICollaboraDocument,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    const createdBy = collaboraDocument.createdBy;
    if (!createdBy) {
      this.logger?.warn(
        'CreatedBy not set on CollaboraDocument',
        LogContext.COLLABORATION
      );
      return null;
    }

    return loader.load(createdBy);
  }
}
