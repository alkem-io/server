import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOneOptions,
  FindOptionsRelations,
  Repository,
} from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateWhiteboardContentRtInput } from './dto/whiteboard.rt.dto.update.content';
import { ExcalidrawContent } from '@common/interfaces';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { WhiteboardRt } from './whiteboard.rt.entity';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { CreateWhiteboardRtInput } from './dto/whiteboard.rt.dto.create';
import { UpdateWhiteboardRtInput } from './dto/whiteboard.rt.dto.update';
import { WhiteboardRtAuthorizationService } from './whiteboard.rt.service.authorization';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';

@Injectable()
export class WhiteboardRtService {
  constructor(
    @InjectRepository(WhiteboardRt)
    private whiteboardRtRepository: Repository<WhiteboardRt>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private whiteboardRtAuthService: WhiteboardRtAuthorizationService,
    private profileDocumentsService: ProfileDocumentsService,
    @InjectEntityManager() private entityManager: EntityManager
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
          profile: !!updateWhiteboardRtData.profileData,
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

      const framing = await this.entityManager.findOne(CalloutFraming, {
        where: {
          whiteboardRt: { id: whiteboardRt.id },
        },
      });

      if (!framing) {
        throw new EntityNotInitializedException(
          `Framing not initialized on whiteboard: '${whiteboardRt.id}'`,
          LogContext.COLLABORATION
        );
      }

      await this.whiteboardRtAuthService.applyAuthorizationPolicy(
        whiteboardRt,
        framing.authorization
      );
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
          profile: true,
        },
      }
    );

    if (
      !updateWhiteboardContentRtData.content ||
      updateWhiteboardContentRtData.content === whiteboardRt.content
    ) {
      return whiteboardRt;
    }

    if (!whiteboardRt?.profile) {
      throw new EntityNotInitializedException(
        `Profile not initialized on whiteboard: '${whiteboardRt.id}'`,
        LogContext.COLLABORATION
      );
    }

    const newContent = await this.reuploadDocumentsIfNotInBucket(
      JSON.parse(updateWhiteboardContentRtData.content),
      whiteboardRt?.profile.id
    );

    whiteboardRt.content = JSON.stringify(newContent);
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

  private async reuploadDocumentsIfNotInBucket(
    whiteboardContent: ExcalidrawContent,
    profileIdToCheck: string
  ): Promise<ExcalidrawContent> | never {
    if (!whiteboardContent.files) {
      return whiteboardContent;
    }

    const files = Object.entries(whiteboardContent.files);

    if (!files.length) {
      return whiteboardContent;
    }

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }

      const newDocUrl =
        await this.profileDocumentsService.reuploadDocumentsToProfile(
          file.url,
          profileIdToCheck
        );

      if (!newDocUrl) {
        continue;
      }

      // change the url to the new document
      whiteboardContent.files[file.id] = {
        ...file,
        url: newDocUrl,
      };
    }

    return whiteboardContent;
  }
}
