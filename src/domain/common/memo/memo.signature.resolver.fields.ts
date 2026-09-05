import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { SigningAttempt } from '@domain/common/content-signing/signing.attempt.entity';
import { IMemoSignature } from '@domain/common/content-signing/signing.attempt.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => IMemoSignature)
export class MemoSignatureResolverFields {
  constructor(private readonly documentService: DocumentService) {}

  @ResolveField('actor', () => IUser, { nullable: true })
  actor(
    @Parent() attempt: SigningAttempt,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    return loader.load(attempt.actorId);
  }

  @ResolveField('document', () => IDocument, { nullable: true })
  document(@Parent() attempt: SigningAttempt): Promise<IDocument> | null {
    return attempt.signedDocumentId
      ? this.documentService.getDocumentOrFail(attempt.signedDocumentId)
      : null;
  }
}
