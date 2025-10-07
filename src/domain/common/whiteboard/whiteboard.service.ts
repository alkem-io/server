import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
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
import { ExcalidrawContent } from '@common/interfaces';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseService } from '../license/license.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class WhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Whiteboard)
    private whiteboardRepository: Repository<Whiteboard>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private communityResolverService: CommunityResolverService,
    private licenseService: LicenseService
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
      whiteboardData.profile ?? {
        displayName: 'Whiteboard',
      },
      ProfileType.WHITEBOARD,
      storageAggregator
    );
    await this.profileService.addVisualsOnProfile(
      whiteboard.profile,
      whiteboardData.profile?.visuals,
      [VisualType.CARD]
    );
    await this.profileService.addVisualsOnProfile(
      whiteboard.profile,
      whiteboardData.profile?.visuals,
      [VisualType.BANNER]
    );
    await this.profileService.addOrUpdateTagsetOnProfile(whiteboard.profile, {
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

    if (updateWhiteboardData.profile) {
      whiteboard.profile = await this.profileService.updateProfile(
        whiteboard.profile,
        updateWhiteboardData.profile
      );
    }

    if (updateWhiteboardData.contentUpdatePolicy) {
      whiteboard.contentUpdatePolicy = updateWhiteboardData.contentUpdatePolicy;
    }
    whiteboard = await this.save(whiteboard);

    return whiteboard;
  }

  async updateWhiteboardContent(
    whiteboardInputId: string,
    updateWhiteboardContent: string
  ): Promise<IWhiteboard> {
    const whiteboard = await this.getWhiteboardOrFail(whiteboardInputId, {
      loadEagerRelations: false,
      relations: {
        profile: true,
      },
      select: {
        id: true,
        profile: {
          id: true,
        },
      },
    });
    const newWhiteboardContent = JSON.parse(updateWhiteboardContent);

    if (!whiteboard?.profile) {
      throw new EntityNotInitializedException(
        `Profile not initialized on whiteboard: '${whiteboard.id}'`,
        LogContext.COLLABORATION
      );
    }

    // TODO: is this still needed? It is a lot of work to be doing on every
    // whiteboard content save. Plus I think it is an inherent risk.
    const newContentWithFiles = await this.reuploadDocumentsIfNotInBucket(
      newWhiteboardContent,
      whiteboard?.profile.id
    );

    whiteboard.content = JSON.stringify(newContentWithFiles);

    return this.save(whiteboard);
  }

  public async isMultiUser(whiteboardId: string): Promise<boolean> {
    const license =
      await this.communityResolverService.getCollaborationLicenseFromWhiteboardOrFail(
        whiteboardId
      );

    return this.licenseService.isEntitlementEnabled(
      license,
      LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER
    );
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
  // todo: use one optimized query with a "where not exists"
  // to return just the ones not in the bucket
  // https://github.com/alkem-io/server/issues/4559
  /**
   * Re-uploads documents if not in the bucket.
   * @throws {EntityNotInitializedException} if profile or storage bucket is not found.
   */
  private async reuploadDocumentsIfNotInBucket(
    whiteboardContent: ExcalidrawContent,
    profileIdToCheck: string
  ): Promise<ExcalidrawContent> {
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
    if (!profile.storageBucket) {
      throw new EntityNotInitializedException(
        'Profile: no definition of StorageBucket',
        LogContext.PROFILE
      );
    }

    for (const [, file] of files) {
      if (!file.url) {
        continue;
      }
      let newDocUrl: string | undefined;
      try {
        newDocUrl =
          await this.profileDocumentsService.reuploadFileOnStorageBucket(
            file.url,
            profile.storageBucket,
            true
          );
      } catch (e: any) {
        if (e instanceof EntityNotFoundException) {
          this.logger.warn?.(
            `Tried to re-upload file (${file.url}) but file was not found: ${e?.message}`,
            LogContext.WHITEBOARDS
          );
        } else {
          this.logger.warn?.(
            `Tried to re-upload file (${file.url}) but an error occurred: ${e?.message}`,
            LogContext.WHITEBOARDS
          );
        }

        newDocUrl = undefined;
      }

      if (!newDocUrl || newDocUrl === file.url) {
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
