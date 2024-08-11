import { Injectable } from '@nestjs/common';
import { IVisual } from './visual.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { DocumentService } from '@domain/storage/document/document.service';
import { VisualService } from './visual.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { urlToBuffer } from '@common/utils/url.to.buffer';
import { avatarMinImageSize, avatarMaxImageSize } from './avatar.constants';
import { IDocument } from '@domain/storage/document';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';

export type AvatarDocument = { visual: IVisual; document: IDocument };

@Injectable()
export class AvatarService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    private documentAuthorizationsService: DocumentAuthorizationService,
    private visualService: VisualService
  ) {}
  // todo: delete this since it's not used?
  // will remove a dependency package and some code
  public async createAvatarFromURL(
    storageBucketId: string,
    userId: string,
    avatarURL: string
  ): Promise<AvatarDocument> {
    const imageBuffer = await urlToBuffer(avatarURL);

    const fileInfo = await (
      await import('file-type')
    ).fileTypeFromBuffer(imageBuffer);

    let document =
      await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        imageBuffer,
        'profilePicture', // we can't really infer the name
        fileInfo?.mime ?? MimeTypeVisual.PNG,
        userId,
        false
      );
    document = await this.documentService.saveDocument(document);

    const storageBucket =
      await this.storageBucketService.getStorageBucketOrFail(storageBucketId, {
        relations: { documents: true },
      });
    const url = this.documentService.getPubliclyAccessibleURL(document);
    const documentAuthorizations =
      this.documentAuthorizationsService.applyAuthorizationPolicy(
        document,
        storageBucket.authorization
      );
    await this.authorizationPolicyService.saveAll(documentAuthorizations);

    const visual = await this.visualService.createVisual(
      {
        name: 'avatar',
        minWidth: avatarMinImageSize,
        maxWidth: avatarMaxImageSize,
        minHeight: avatarMinImageSize,
        maxHeight: avatarMaxImageSize,
        aspectRatio: 1,
      },
      url
    );
    return { visual, document };
  }
}
