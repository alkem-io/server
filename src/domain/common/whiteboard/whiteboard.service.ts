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
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateWhiteboardContentInput } from './dto/whiteboard.dto.update.content';
import { ExcalidrawContent } from '@common/interfaces';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private whiteboardAuthService: WhiteboardAuthorizationService,
    @InjectEntityManager() private entityManager: EntityManager
  ) {}

  async createWhiteboard(
    whiteboardData: CreateWhiteboardInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<IWhiteboard> {
    const whiteboard: IWhiteboard = Whiteboard.create({
      ...whiteboardData,
    });
    whiteboard.authorization = new AuthorizationPolicy();
    whiteboard.createdBy = userID;
    whiteboard.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    whiteboard.profile = await this.profileService.createProfile(
      whiteboardData.profileData,
      ProfileType.WHITEBOARD,
      storageAggregator
    );
    await this.profileService.addVisualOnProfile(
      whiteboard.profile,
      VisualType.CARD
    );
    await this.profileService.addTagsetOnProfile(whiteboard.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return this.save(whiteboard);
  }

  async getWhiteboardOrFail(
    whiteboardID: string,
    options?: FindOneOptions<Whiteboard>
  ): Promise<IWhiteboard | never> {
    const whiteboard = await this.whiteboardRepository.findOne({
      where: { id: whiteboardID },
      ...options,
    });

    if (!whiteboard)
      throw new EntityNotFoundException(
        `Not able to locate Whiteboard with the specified ID: ${whiteboardID}`,
        LogContext.CHALLENGES
      );
    return whiteboard;
  }

  async deleteWhiteboard(whiteboardID: string): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardID, {
      relations: {
        authorization: true,
        profile: true,
      },
    });

    if (!whiteboard.profile) {
      throw new RelationshipNotFoundException(
        `Profile not found on whiteboard: '${whiteboard.id}'`,
        LogContext.CHALLENGES
      );
    }

    if (!whiteboard.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on whiteboard: '${whiteboard.id}'`,
        LogContext.CHALLENGES
      );
    }

    await this.profileService.deleteProfile(whiteboard.profile.id);
    await this.authorizationPolicyService.delete(whiteboard.authorization);

    const deletedWhiteboard = await this.whiteboardRepository.remove(
      whiteboard as Whiteboard
    );
    deletedWhiteboard.id = whiteboardID;
    return deletedWhiteboard;
  }

  async updateWhiteboard(
    whiteboardInput: IWhiteboard,
    updateWhiteboardData: UpdateWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: !!updateWhiteboardData.profileData,
      },
    });

    if (updateWhiteboardData.profileData) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profileData
      );
    }

    if (updateWhiteboardData.contentUpdatePolicy) {
      whiteboard.contentUpdatePolicy = updateWhiteboardData.contentUpdatePolicy;

      const framing = await this.entityManager.findOne(CalloutFraming, {
        where: {
          whiteboard: { id: whiteboard.id },
        },
      });

      if (!framing) {
        throw new EntityNotInitializedException(
          `Framing not initialized on whiteboard: '${whiteboard.id}'`,
          LogContext.COLLABORATION
        );
      }

      await this.whiteboardAuthService.applyAuthorizationPolicy(
        whiteboard,
        framing.authorization
      );
    }

    return this.save(whiteboard);
  }

  async updateWhiteboardContent(
    whiteboardInput: IWhiteboard,
    updateWhiteboardContentData: UpdateWhiteboardContentInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
      },
    });

    if (
      !updateWhiteboardContentData.content ||
      updateWhiteboardContentData.content === whiteboard.content
    ) {
      return whiteboard;
    }

    if (!whiteboard?.profile) {
      throw new EntityNotInitializedException(
        `Profile not initialized on whiteboard: '${whiteboard.id}'`,
        LogContext.COLLABORATION
      );
    }

    const newContent = await this.reuploadDocumentsIfNotInBucket(
      JSON.parse(updateWhiteboardContentData.content),
      whiteboard?.profile.id
    );

    whiteboard.content = JSON.stringify(newContent);
    return this.save(whiteboard);
  }

  public async getProfile(
    whiteboardId: string,
    relations?: FindOptionsRelations<IWhiteboard>
  ): Promise<IProfile> {
    const whiteboardLoaded = await this.getWhiteboardOrFail(whiteboardId, {
      relations: {
        profile: true,
        ...relations,
      },
    });

    if (!whiteboardLoaded.profile)
      throw new EntityNotFoundException(
        `Whiteboard profile not initialised: ${whiteboardId}`,
        LogContext.COLLABORATION
      );

    return whiteboardLoaded.profile;
  }

  public save(whiteboard: IWhiteboard): Promise<IWhiteboard> {
    return this.whiteboardRepository.save(whiteboard);
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

  public createWhiteboardInputFromWhiteboard(
    whiteboard?: IWhiteboard
  ): CreateWhiteboardInput | undefined {
    if (!whiteboard) return undefined;
    return {
      profileData: this.profileService.createProfileInputFromProfile(
        whiteboard.profile
      ),
      content: whiteboard.content,
      nameID: whiteboard.nameID,
    };
  }
}
