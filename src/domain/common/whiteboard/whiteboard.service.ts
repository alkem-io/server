import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ExcalidrawContent } from '@common/interfaces';
import { compressText, decompressText } from '@common/utils/compression.util';
import { IProfile } from '@domain/common/profile';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq } from 'drizzle-orm';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import { CreateWhiteboardInput } from './dto/whiteboard.dto.create';
import { UpdateWhiteboardInput } from './dto/whiteboard.dto.update';
import { Whiteboard } from './whiteboard.entity';
import { IWhiteboard } from './whiteboard.interface';
import { whiteboards } from './whiteboard.schema';

@Injectable()
export class WhiteboardService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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
    } as Partial<Whiteboard>);
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
      [VisualType.CARD, VisualType.WHITEBOARD_PREVIEW]
    );
    await this.profileService.addOrUpdateTagsetOnProfile(whiteboard.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    whiteboard.previewSettings = {
      mode: whiteboardData.previewSettings?.mode ?? WhiteboardPreviewMode.AUTO,
      coordinates: whiteboardData.previewSettings?.coordinates ?? null,
    };

    return whiteboard;
  }

  /**
   * Compresses whiteboard content before saving to database.
   * Moved from @BeforeInsert/@BeforeUpdate lifecycle hooks.
   */
  private async compressContent(content: string): Promise<string> {
    if (content !== '') {
      try {
        return await compressText(content);
      } catch {
        // rethrow to be caught higher, does not crash the server
        throw new Error('Failed to compress content');
      }
    }
    return content;
  }

  /**
   * Decompresses whiteboard content after loading from database.
   * Moved from @AfterLoad/@AfterInsert/@AfterUpdate lifecycle hooks.
   */
  private async decompressContent(content: string): Promise<string> {
    if (content !== '') {
      try {
        return await decompressText(content);
      } catch (e: any) {
        // rethrow to be caught higher, does not crash the server
        throw new Error(`Failed to decompress content: ${e?.message}`);
      }
    }
    return content;
  }

  async getWhiteboardOrFail(
    whiteboardID: string,
    options?: {
      relations?: Record<string, boolean | Record<string, boolean>>;
      select?: Record<string, boolean | Record<string, boolean>>;
      loadEagerRelations?: boolean;
    }
  ): Promise<IWhiteboard | never> {
    const withClause: Record<string, any> = {};

    if (options?.relations) {
      Object.keys(options.relations).forEach(key => {
        const value = options.relations![key];
        if (typeof value === 'boolean' && value) {
          withClause[key] = true;
        } else if (typeof value === 'object') {
          withClause[key] = { with: value };
        }
      });
    }

    const whiteboard = await this.db.query.whiteboards.findFirst({
      where: eq(whiteboards.id, whiteboardID),
      with: withClause,
    });

    if (!whiteboard)
      throw new EntityNotFoundException(
        `Not able to locate Whiteboard with the specified ID: ${whiteboardID}`,
        LogContext.SPACES
      );

    // Decompress content after loading
    const result = whiteboard as unknown as IWhiteboard;
    result.content = await this.decompressContent(result.content);

    return result;
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

    await this.db.delete(whiteboards).where(eq(whiteboards.id, whiteboardID));

    whiteboard.id = whiteboardID;
    return whiteboard;
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

    if (updateWhiteboardData.previewSettings) {
      if (updateWhiteboardData.previewSettings.mode !== undefined) {
        whiteboard.previewSettings.mode =
          updateWhiteboardData.previewSettings.mode;
      }
      if (updateWhiteboardData.previewSettings.coordinates !== undefined) {
        whiteboard.previewSettings.coordinates =
          updateWhiteboardData.previewSettings.coordinates;
      }
    }

    const updateData: Record<string, any> = {};
    if (updateWhiteboardData.contentUpdatePolicy) {
      updateData.contentUpdatePolicy = updateWhiteboardData.contentUpdatePolicy;
    }
    if (updateWhiteboardData.previewSettings) {
      updateData.previewSettings = whiteboard.previewSettings;
    }

    if (Object.keys(updateData).length > 0) {
      await this.db
        .update(whiteboards)
        .set(updateData)
        .where(eq(whiteboards.id, whiteboard.id));
    }

    // Reload to get updated data
    whiteboard = await this.getWhiteboardOrFail(whiteboard.id, {
      relations: {
        profile: true,
      },
    });

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

    const contentString = JSON.stringify(newContentWithFiles);
    const compressedContent = await this.compressContent(contentString);

    await this.db
      .update(whiteboards)
      .set({ content: compressedContent })
      .where(eq(whiteboards.id, whiteboardInputId));

    // Reload and return with decompressed content
    return await this.getWhiteboardOrFail(whiteboardInputId, {
      relations: {
        profile: true,
      },
    });
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
    relations?: Record<string, boolean | Record<string, boolean>>
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

  public async save(whiteboard: IWhiteboard): Promise<IWhiteboard> {
    // Compress content before saving
    const compressedContent = await this.compressContent(whiteboard.content);

    const updateData: Record<string, any> = {
      content: compressedContent,
      contentUpdatePolicy: whiteboard.contentUpdatePolicy,
      previewSettings: whiteboard.previewSettings,
    };

    if (whiteboard.createdBy !== undefined) {
      updateData.createdBy = whiteboard.createdBy;
    }

    await this.db
      .update(whiteboards)
      .set(updateData)
      .where(eq(whiteboards.id, whiteboard.id));

    // Reload with decompressed content
    return await this.getWhiteboardOrFail(whiteboard.id);
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
          storageBucket: true,
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
