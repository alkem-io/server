import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { SigningAttempt } from '@domain/common/content-signing/signing.attempt.entity';
import { IMemoSignature } from '@domain/common/content-signing/signing.attempt.interface';
import { DELETED_USER_SENTINEL } from '@domain/community/user/account-deletion/deleted.user.sentinel';
import { IUser } from '@domain/community/user/user.interface';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => IMemoSignature)
export class MemoSignatureResolverFields {
  constructor(private readonly documentService: DocumentService) {}

  @ResolveField('actor', () => IUser, {
    nullable: true,
    description: 'The Alkemio user who initiated this signed copy.',
  })
  async actor(
    @Parent() attempt: SigningAttempt,
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    return (await loader.load(attempt.actorId)) ?? DELETED_USER_SENTINEL;
  }

  @ResolveField('document', () => IDocument, {
    nullable: true,
    description: 'The immutable PDF produced for this signed copy.',
  })
  document(@Parent() attempt: SigningAttempt): Promise<IDocument> | null {
    return attempt.signedDocumentId
      ? this.documentService.getDocumentOrFail(attempt.signedDocumentId)
      : null;
  }
}
