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
import { CollaboraDocumentService } from './collabora.document.service';

@Resolver(() => ICollaboraDocument)
export class CollaboraDocumentResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private collaboraDocumentService: CollaboraDocumentService
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

  @ResolveField('previewUrl', () => String, {
    nullable: true,
    description:
      'An authorized, same-origin preview image endpoint for the current saved document, or null when there is no backing file to preview. NOT a bearer URL: every request against it is independently authorized against the current document READ policy.',
  })
  async previewUrl(
    @Parent() collaboraDocument: ICollaboraDocument
  ): Promise<string | null> {
    // The two paths that reach a CollaboraDocument through a Callout — framing
    // and contribution — already load `document`, so a board of N documents
    // costs no extra queries here. `undefined` means the relation was NOT
    // loaded (the direct/root query paths); `null` means it WAS loaded and
    // there is genuinely no backing file. Only the former may re-query.
    if (collaboraDocument.document !== undefined) {
      return CollaboraDocumentService.buildPreviewUrl(
        collaboraDocument.document?.id
      );
    }
    return this.collaboraDocumentService.getPreviewUrl(collaboraDocument.id);
  }
}
