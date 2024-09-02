import EventEmitter = require('node:events');
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
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { WHITEBOARD_CONTENT_UPDATE } from './events/event.names';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { isEqual } from 'lodash';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class WhiteboardService {
  // The eventEmitter is used for cross-service communication.
  // It allows services to send and receive messages, enabling them to coordinate activities or share data.
  public eventEmitter = new EventEmitter();
  constructor(
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private licenseEngineService: LicenseEngineService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private whiteboardAuthService: WhiteboardAuthorizationService,
    private subscriptionPublishService: SubscriptionPublishService,
    private communityResolverService: CommunityResolverService,
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
    whiteboard.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.WHITEBOARD
    );
    whiteboard.createdBy = userID;
    whiteboard.contentUpdatePolicy = ContentUpdatePolicy.CONTRIBUTORS;

    whiteboard.profile = await this.profileService.createProfile(
      whiteboardData.profileData,
      ProfileType.WHITEBOARD,
      storageAggregator
    );
    this.profileService.addVisualOnProfile(whiteboard.profile, VisualType.CARD);
    await this.profileService.addTagsetOnProfile(whiteboard.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    return whiteboard;
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
        LogContext.SPACES
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
        LogContext.SPACES
      );
    }

    if (!whiteboard.authorization) {
      throw new RelationshipNotFoundException(
        `Authorization not found on whiteboard: '${whiteboard.id}'`,
        LogContext.SPACES
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
    let whiteboard = await this.getWhiteboardOrFail(whiteboardInput.id, {
      relations: {
        profile: true,
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

      if (framing) {
        const updatedWhiteboardAuthorizations =
          await this.whiteboardAuthService.applyAuthorizationPolicy(
            whiteboard,
            framing.authorization
          );
        await this.authorizationPolicyService.saveAll(
          updatedWhiteboardAuthorizations
        );
      } else {
        const contribution = await this.entityManager.findOne(
          CalloutContribution,
          {
            where: {
              whiteboard: { id: whiteboard.id },
            },
          }
        );
        if (contribution) {
          const contributionAuthorizations =
            await this.whiteboardAuthService.applyAuthorizationPolicy(
              whiteboard,
              contribution.authorization
            );
          await this.authorizationPolicyService.saveAll(
            contributionAuthorizations
          );
        }
      }
    }
    whiteboard = await this.save(whiteboard);

    if (updateWhiteboardData.content) {
      const input: UpdateWhiteboardContentInput = {
        ID: whiteboard.id,
        content: updateWhiteboardData.content,
      };
      return await this.updateWhiteboardContent(whiteboard, input);
    }

    return whiteboard;
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
    const currentWhiteboardContent = JSON.parse(whiteboard.content);
    const newWhiteboardContent = JSON.parse(
      updateWhiteboardContentData.content
    );

    if (isEqual(currentWhiteboardContent, newWhiteboardContent)) {
      whiteboard.updatedDate = new Date();

      this.subscriptionPublishService.publishWhiteboardSaved(
        whiteboard.id,
        whiteboard.updatedDate
      );
      return this.save(whiteboard);
    }

    if (!whiteboard?.profile) {
      throw new EntityNotInitializedException(
        `Profile not initialized on whiteboard: '${whiteboard.id}'`,
        LogContext.COLLABORATION
      );
    }

    const newContentWithFiles = await this.reuploadDocumentsIfNotInBucket(
      newWhiteboardContent,
      whiteboard?.profile.id
    );

    whiteboard.content = JSON.stringify(newContentWithFiles);
    const savedWhiteboard = await this.save(whiteboard);

    this.eventEmitter.emit(WHITEBOARD_CONTENT_UPDATE, savedWhiteboard.id);

    this.subscriptionPublishService.publishWhiteboardSaved(
      whiteboard.id,
      savedWhiteboard.updatedDate
    );

    return savedWhiteboard;
  }

  async isMultiUser(whiteboardId: string): Promise<boolean> {
    const community =
      await this.communityResolverService.getCommunityFromWhiteboardOrFail(
        whiteboardId
      );
    const license =
      await this.communityResolverService.getAccountAgentFromCommunityOrFail(
        community
      );

    const enabled = await this.licenseEngineService.isAccessGranted(
      LicensePrivilege.SPACE_WHITEBOARD_MULTI_USER,
      license
    );

    return enabled;
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

    const profile = await this.profileService.getProfileOrFail(
      profileIdToCheck,
      {
        relations: {
          storageBucket: {
            documents: true,
          },
        },
      }
    );

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }

      const newDocUrl =
        await this.profileDocumentsService.reuploadDocumentToProfile(
          file.url,
          profile
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
