import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AlkemioErrorStatus, LogContext, ProfileType } from '@common/enums';
import { WhiteboardRt } from './whiteboard.rt.entity';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { CreateWhiteboardRtInput } from './dto/whiteboard.rt.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { UpdateWhiteboardRtInput } from './dto/whiteboard.rt.dto.update';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateWhiteboardContentRtInput } from './dto/whiteboard.rt.dto.update.content';
import { ExcalidrawContent } from '@common/interfaces';
import { BaseException } from '@common/exceptions/base.exception';
import { DocumentService } from '@domain/storage/document/document.service';
import { IProfile } from '@domain/common/profile';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { IDocument } from '@domain/storage/document';

@Injectable()
export class WhiteboardRtService {
  constructor(
    @InjectRepository(WhiteboardRt)
    private whiteboardRtRepository: Repository<WhiteboardRt>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private configService: ConfigService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService
  ) {}

  async createWhiteboardRt(
    whiteboardRtData: CreateWhiteboardRtInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IWhiteboardRt> {
    const whiteboardRt: IWhiteboardRt = WhiteboardRt.create({
      ...whiteboardRtData,
    });
    whiteboardRt.authorization = new AuthorizationPolicy();
    whiteboardRt.createdBy = userID;
    whiteboardRt.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    whiteboardRt.profile = await this.profileService.createProfile(
      whiteboardRtData.profileData,
      ProfileType.WHITEBOARD_RT,
      storageAggregator
    );
    await this.profileService.addVisualOnProfile(
      whiteboardRt.profile,
      VisualType.CARD
    );
    await this.profileService.addTagsetOnProfile(whiteboardRt.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return this.save(whiteboardRt);
  }

  async getWhiteboardRtOrFail(
    whiteboardRtID: string,
    options?: FindOneOptions<WhiteboardRt>
  ): Promise<IWhiteboardRt | never> {
    const whiteboardRt = await this.whiteboardRtRepository.findOne({
      where: { id: whiteboardRtID },
      ...options,
    });

    if (!whiteboardRt)
      throw new EntityNotFoundException(
        `Not able to locate WhiteboardRt with the specified ID: ${whiteboardRtID}`,
        LogContext.CHALLENGES
      );
    return whiteboardRt;
  }

  async deleteWhiteboardRt(whiteboardRtID: string): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.getWhiteboardRtOrFail(whiteboardRtID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (whiteboardRt.profile) {
      await this.profileService.deleteProfile(whiteboardRt.profile.id);
    }

    if (whiteboardRt.authorization) {
      await this.authorizationPolicyService.delete(whiteboardRt.authorization);
    }

    const deletedWhiteboardRt = await this.whiteboardRtRepository.remove(
      whiteboardRt as WhiteboardRt
    );
    deletedWhiteboardRt.id = whiteboardRtID;
    return deletedWhiteboardRt;
  }

  async updateWhiteboardRt(
    whiteboardRtInput: IWhiteboardRt,
    updateWhiteboardRtData: UpdateWhiteboardRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.getWhiteboardRtOrFail(
      whiteboardRtInput.id,
      {
        relations: {
          profile: true,
        },
      }
    );

    if (updateWhiteboardRtData.profileData) {
      whiteboardRt.profile = await this.profileService.updateProfile(
        whiteboardRt.profile,
        updateWhiteboardRtData.profileData
      );
    }

    if (updateWhiteboardRtData.contentUpdatePolicy) {
      whiteboardRt.contentUpdatePolicy =
        updateWhiteboardRtData.contentUpdatePolicy;
    }

    return this.save(whiteboardRt);
  }

  async updateWhiteboardContentRt(
    whiteboardRtInput: IWhiteboardRt,
    updateWhiteboardContentRtData: UpdateWhiteboardContentRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.getWhiteboardRtOrFail(
      whiteboardRtInput.id,
      {
        relations: {
          profile: {
            storageBucket: {
              documents: true,
            },
          },
        },
      }
    );

    if (
      !updateWhiteboardContentRtData.content ||
      updateWhiteboardContentRtData.content === whiteboardRt.content
    ) {
      return whiteboardRt;
    }

    if (!whiteboardRt?.profile?.storageBucket) {
      throw new EntityNotInitializedException(
        `Storage bucket not initialized on whiteboard: '${whiteboardRt.id}'`,
        LogContext.COLLABORATION
      );
    }

    const jsonContent: ExcalidrawContent = JSON.parse(
      updateWhiteboardContentRtData.content
    );

    if (!jsonContent.files) {
      return this.save({
        ...whiteboardRt,
        content: updateWhiteboardContentRtData.content,
      });
    }

    const files = Object.entries(jsonContent.files);

    if (!files.length) {
      return this.save({
        ...whiteboardRt,
        content: updateWhiteboardContentRtData.content,
      });
    }

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }

      if (!this.documentService.isAlkemioDocumentURL(file.url)) {
        throw new BaseException(
          'File URL not inside Alkemio',
          LogContext.COLLABORATION,
          AlkemioErrorStatus.UNSPECIFIED
        );
      }

      const newDoc = await this.reuploadDocumentIfNotInBucket(
        file.url,
        whiteboardRt?.profile?.storageBucket
      );

      if (!newDoc) {
        continue;
      }
      // change the url to the new document
      jsonContent.files[file.id] = {
        ...file,
        url: this.documentService.getPubliclyAccessibleURL(newDoc),
      };
    }

    whiteboardRt.content = JSON.stringify(jsonContent);
    return this.save(whiteboardRt);
  }

  public async getProfile(
    whiteboardRtId: string,
    relations?: FindOptionsRelations<IWhiteboardRt>
  ): Promise<IProfile> {
    const whiteboardRtLoaded = await this.getWhiteboardRtOrFail(
      whiteboardRtId,
      {
        relations: {
          profile: true,
          ...relations,
        },
      }
    );

    if (!whiteboardRtLoaded.profile)
      throw new EntityNotFoundException(
        `WhiteboardRt profile not initialised: ${whiteboardRtId}`,
        LogContext.COLLABORATION
      );

    return whiteboardRtLoaded.profile;
  }

  public save(whiteboardRt: IWhiteboardRt): Promise<IWhiteboardRt> {
    return this.whiteboardRtRepository.save(whiteboardRt);
  }

  private async reuploadDocumentIfNotInBucket(
    fileUrl: string,
    storageBucketToCheck: IStorageBucket
  ): Promise<IDocument | undefined> | never {
    const docInContent = await this.documentService.getDocumentFromURL(fileUrl);

    if (!docInContent) {
      throw new BaseException(
        `File with URL '${fileUrl}' not found`,
        LogContext.COLLABORATION,
        AlkemioErrorStatus.NOT_FOUND
      );
    }

    if (!storageBucketToCheck?.documents) {
      throw new EntityNotInitializedException(
        `Documents not initialized for storage bucket: '${storageBucketToCheck.id}'`,
        LogContext.COLLABORATION
      );
    }

    const docInThisBucket = storageBucketToCheck?.documents.find(
      doc => doc.id === docInContent.id
    );

    if (docInThisBucket) {
      return undefined;
    }

    if (!docInThisBucket) {
      // if not in this bucket - create it inside it
      const newDoc = await this.documentService.createDocument({
        createdBy: docInContent.createdBy,
        displayName: docInContent.displayName,
        externalID: docInContent.externalID,
        mimeType: docInContent.mimeType,
        size: docInContent.size,
        anonymousReadAccess: false,
      });
      await this.storageBucketService.addDocumentToBucketOrFail(
        storageBucketToCheck?.id,
        newDoc
      );
      await this.documentAuthorizationService.applyAuthorizationPolicy(
        newDoc,
        storageBucketToCheck.authorization
      );
      return newDoc;
    }
  }
}
