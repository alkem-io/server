import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { LinkService } from '@domain/collaboration/link/link.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IMediaGallery } from '@domain/common/media-gallery/media.gallery.interface';
import { MediaGalleryService } from '@domain/common/media-gallery/media.gallery.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { CreateMemoInput, IMemo } from '@domain/common/memo/types';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable } from '@nestjs/common';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { eq } from 'drizzle-orm';
import { calloutFramings } from './callout.framing.schema';
import { ILink } from '../link/link.interface';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { CreateCalloutFramingInput } from './dto/callout.framing.dto.create';
import { UpdateCalloutFramingInput } from './dto/callout.framing.dto.update';

type FramingFindOptions = {
  relations?: {
    profile?: boolean;
    whiteboard?: boolean;
    link?: boolean;
    memo?: boolean;
    mediaGallery?: boolean | { storageBucket?: boolean };
    authorization?: boolean;
  };
};

@Injectable()
export class CalloutFramingService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    private whiteboardService: WhiteboardService,
    private linkService: LinkService,
    private memoService: MemoService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    private mediaGalleryService: MediaGalleryService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public async createCalloutFraming(
    calloutFramingData: CreateCalloutFramingInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutFraming> {
    const calloutFraming: ICalloutFraming =
      CalloutFraming.create(calloutFramingData as Partial<CalloutFraming>);

    calloutFraming.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT_FRAMING
    );

    const { profile: profileData, tags } = calloutFramingData;

    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: tags,
    };

    const tagsetInputs = [defaultTagset];

    calloutFramingData.profile.tagsets = this.tagsetService.updateTagsetInputs(
      calloutFraming.profile.tagsets,
      tagsetInputs
    );

    calloutFraming.profile = await this.profileService.createProfile(
      profileData,
      ProfileType.CALLOUT_FRAMING,
      storageAggregator
    );

    calloutFraming.type = calloutFramingData.type ?? CalloutFramingType.NONE;

    if (calloutFraming.type === CalloutFramingType.WHITEBOARD) {
      if (calloutFramingData.whiteboard) {
        await this.createNewWhiteboardInCalloutFraming(
          calloutFraming,
          calloutFramingData.whiteboard,
          storageAggregator,
          userID
        );
      } else {
        throw new ValidationException(
          'Callout Framing of type WHITEBOARD requires whiteboard data.',
          LogContext.COLLABORATION
        );
      }
    }

    if (calloutFraming.type === CalloutFramingType.LINK) {
      if (calloutFramingData.link) {
        await this.createNewLinkInCalloutFraming(
          calloutFraming,
          calloutFramingData.link,
          storageAggregator
        );
      } else {
        throw new ValidationException(
          'Callout Framing of type LINK requires link data.',
          LogContext.COLLABORATION
        );
      }
    }

    if (calloutFraming.type === CalloutFramingType.MEMO) {
      if (calloutFramingData.memo) {
        await this.createNewMemoInCalloutFraming(
          calloutFraming,
          calloutFramingData.memo,
          storageAggregator,
          userID
        );
      } else {
        throw new ValidationException(
          'Callout Framing of type MEMO requires memo data.',
          LogContext.COLLABORATION
        );
      }
    }

    if (calloutFraming.type === CalloutFramingType.MEDIA_GALLERY) {
      await this.createNewMediaGalleryInCalloutFraming(
        calloutFraming,
        calloutFramingData.mediaGallery?.visuals,
        storageAggregator,
        userID
      );
    }

    return calloutFraming;
  }

  private async createNewWhiteboardInCalloutFraming(
    calloutFraming: ICalloutFraming,
    whiteboardData: CreateWhiteboardInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ) {
    const reservedNameIDs: string[] = []; // no reserved nameIDs for framing
    whiteboardData.nameID =
      this.namingService.createNameIdAvoidingReservedNameIDs(
        `${whiteboardData.profile?.displayName ?? 'whiteboard'}`,
        reservedNameIDs
      );
    calloutFraming.whiteboard = await this.whiteboardService.createWhiteboard(
      whiteboardData,
      storageAggregator,
      userID
    );
  }

  private async createNewMemoInCalloutFraming(
    calloutFraming: ICalloutFraming,
    memoData: CreateMemoInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ) {
    const reservedNameIDs: string[] = []; // no reserved nameIDs for framing
    memoData.nameID = this.namingService.createNameIdAvoidingReservedNameIDs(
      `${memoData.profile?.displayName ?? 'memo'}`,
      reservedNameIDs
    );
    calloutFraming.memo = await this.memoService.createMemo(
      memoData,
      storageAggregator,
      userID
    );
    await this.profileService.addVisualsOnProfile(
      calloutFraming.memo.profile,
      memoData.profile?.visuals,
      [VisualType.BANNER]
    );
  }

  private async createNewLinkInCalloutFraming(
    calloutFraming: ICalloutFraming,
    linkData: CreateLinkInput,
    storageAggregator: IStorageAggregator
  ) {
    calloutFraming.link = await this.linkService.createLink(
      linkData,
      storageAggregator
    );
  }

  private async createNewMediaGalleryInCalloutFraming(
    calloutFraming: ICalloutFraming,
    visuals:
      | { name: VisualType; uri: string; sortOrder?: number }[]
      | undefined,
    storageAggregator: IStorageAggregator,
    userID?: string
  ) {
    calloutFraming.mediaGallery =
      await this.mediaGalleryService.createMediaGallery(
        storageAggregator,
        userID
      );
    if (
      visuals &&
      visuals.length > 0 &&
      calloutFraming.mediaGallery.storageBucket
    ) {
      if (!calloutFraming.mediaGallery.visuals) {
        calloutFraming.mediaGallery.visuals = [];
      }
      for (const visualData of visuals) {
        const newUrl =
          await this.profileDocumentsService.reuploadFileOnStorageBucket(
            visualData.uri,
            calloutFraming.mediaGallery.storageBucket
          );
        if (newUrl) {
          const visual = await this.mediaGalleryService.addVisualToMediaGallery(
            calloutFraming.mediaGallery.id,
            visualData.name,
            visualData.sortOrder
          );
          visual.uri = newUrl;
          calloutFraming.mediaGallery.visuals.push(visual);
          await this.mediaGalleryService.saveVisual(visual);
        }
      }
    }
  }

  private async deleteInconsistentFramingContent(
    calloutFraming: ICalloutFraming
  ) {
    // If there was a memo before, we delete it
    if (
      calloutFraming.memo &&
      calloutFraming.type !== CalloutFramingType.MEMO
    ) {
      await this.memoService.deleteMemo(calloutFraming.memo.id);
      calloutFraming.memo = undefined;
    }

    // If there was a media gallery before, we delete it
    if (
      calloutFraming.mediaGallery &&
      calloutFraming.type !== CalloutFramingType.MEDIA_GALLERY
    ) {
      await this.mediaGalleryService.deleteMediaGallery(
        calloutFraming.mediaGallery.id
      );
      calloutFraming.mediaGallery = undefined;
    }

    // If there was a link before, we delete it
    if (
      calloutFraming.link &&
      calloutFraming.type !== CalloutFramingType.LINK
    ) {
      await this.linkService.deleteLink(calloutFraming.link.id);
      calloutFraming.link = undefined;
    }

    // If there was a whiteboard before, we delete it
    if (
      calloutFraming.whiteboard &&
      calloutFraming.type !== CalloutFramingType.WHITEBOARD
    ) {
      await this.whiteboardService.deleteWhiteboard(
        calloutFraming.whiteboard.id
      );
      calloutFraming.whiteboard = undefined;
    }
  }

  public async updateCalloutFraming(
    calloutFraming: ICalloutFraming,
    calloutFramingData: UpdateCalloutFramingInput,
    storageAggregator: IStorageAggregator,
    isParentCalloutTemplate: boolean,
    userID?: string
  ): Promise<ICalloutFraming> {
    if (calloutFramingData.profile) {
      calloutFraming.profile = await this.profileService.updateProfile(
        calloutFraming.profile,
        calloutFramingData.profile
      );
    }

    if (calloutFramingData.type) {
      const oldType = calloutFraming.type;
      const newType = calloutFramingData.type;

      // Validate framing type transitions for callout templates
      if (
        isParentCalloutTemplate &&
        newType !== oldType &&
        newType !== CalloutFramingType.NONE
      ) {
        throw new ValidationException(
          'Callout templates can only transition framing type to NONE.',
          LogContext.COLLABORATION
        );
      }
      calloutFraming.type = calloutFramingData.type;
    }

    await this.deleteInconsistentFramingContent(calloutFraming);
    switch (calloutFraming.type) {
      case CalloutFramingType.WHITEBOARD: {
        // if there is no content coming with the mutation, we do nothing with the whiteboard
        if (!calloutFramingData.whiteboardContent) {
          return calloutFraming;
        }
        // if there is content and a whiteboard, we update it
        if (calloutFraming.whiteboard) {
          calloutFraming.whiteboard =
            await this.whiteboardService.updateWhiteboardContent(
              calloutFraming.whiteboard.id,
              calloutFramingData.whiteboardContent
            );
          if (calloutFramingData.whiteboardPreviewSettings) {
            await this.whiteboardService.updateWhiteboard(
              calloutFraming.whiteboard,
              {
                previewSettings: calloutFramingData.whiteboardPreviewSettings,
              }
            );
          }
        } else {
          // if there is content and no whiteboard, we create a new one
          await this.createNewWhiteboardInCalloutFraming(
            calloutFraming,
            {
              profile: {
                displayName: 'Callout Framing Whiteboard',
              },
              content: calloutFramingData.whiteboardContent,
              previewSettings: calloutFramingData.whiteboardPreviewSettings,
            },
            storageAggregator,
            userID
          );
        }
        break;
      }
      case CalloutFramingType.MEMO: {
        // if there is no content coming with the mutation, we do nothing with the memo
        if (!calloutFramingData.memoContent) {
          return calloutFraming;
        }

        // if there is content and a Memo AND the parent Callout is template, we update it
        if (
          calloutFraming.memo &&
          calloutFramingData.memoContent &&
          isParentCalloutTemplate
        ) {
          calloutFraming.memo = await this.memoService.updateMemoContent(
            calloutFraming.memo.id,
            calloutFramingData.memoContent
          );
        } else {
          // if there is content and no Memo, we create a new one
          await this.createNewMemoInCalloutFraming(
            calloutFraming,
            {
              profile: {
                displayName: 'Callout Framing Memo',
              },
              // content: calloutFramingData.memoContent,
            },
            storageAggregator,
            userID
          );
        }
        break;
      }
      case CalloutFramingType.LINK: {
        // Handle LINK type updates
        if (calloutFraming.link && calloutFramingData.link) {
          calloutFraming.link = await this.linkService.updateLink(
            calloutFramingData.link
          );
        } else if (calloutFramingData.link) {
          calloutFraming.link = await this.linkService.createLink(
            calloutFramingData.link as CreateLinkInput,
            storageAggregator
          );
        }
        break;
      }
      case CalloutFramingType.MEDIA_GALLERY: {
        // Media gallery updates are done through media gallery service/mutations or visual mutations
        if (!calloutFraming.mediaGallery) {
          await this.createNewMediaGalleryInCalloutFraming(
            calloutFraming,
            [],
            storageAggregator,
            userID
          );
        }
        break;
      }
      case CalloutFramingType.NONE:
      default: {
        // if the type is NONE we have already deleted any existing framing content
        break;
      }
    }

    return calloutFraming;
  }

  async delete(calloutFramingInput: ICalloutFraming): Promise<ICalloutFraming> {
    const calloutFramingID = calloutFramingInput.id;
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingID,
      {
        relations: {
          profile: true,
          whiteboard: true,
          link: true,
          memo: true,
          mediaGallery: true,
        },
      }
    );
    if (calloutFraming.profile) {
      await this.profileService.deleteProfile(calloutFraming.profile.id);
    }

    if (calloutFraming.whiteboard) {
      await this.whiteboardService.deleteWhiteboard(
        calloutFraming.whiteboard.id
      );
    }

    if (calloutFraming.link) {
      await this.linkService.deleteLink(calloutFraming.link.id);
    }

    if (calloutFraming.memo) {
      await this.memoService.deleteMemo(calloutFraming.memo.id);
    }

    if (calloutFraming.mediaGallery) {
      await this.mediaGalleryService.deleteMediaGallery(
        calloutFraming.mediaGallery.id
      );
    }

    if (calloutFraming.authorization) {
      await this.authorizationPolicyService.delete(
        calloutFraming.authorization
      );
    }

    await this.db
      .delete(calloutFramings)
      .where(eq(calloutFramings.id, calloutFramingID));
    const result = { ...calloutFraming };
    result.id = calloutFramingID;
    return result;
  }

  async save(calloutFraming: ICalloutFraming): Promise<ICalloutFraming> {
    const [result] = await this.db
      .insert(calloutFramings)
      .values(calloutFraming as any)
      .onConflictDoUpdate({
        target: calloutFramings.id,
        set: calloutFraming as any,
      })
      .returning();
    return result as unknown as ICalloutFraming;
  }

  public async getCalloutFramingOrFail(
    calloutFramingID: string,
    options?: FramingFindOptions
  ): Promise<ICalloutFraming | never> {
    const withClause: Record<string, any> = {};
    if (options?.relations) {
      if (options.relations.profile) withClause.profile = true;
      if (options.relations.whiteboard) withClause.whiteboard = true;
      if (options.relations.link) withClause.link = true;
      if (options.relations.memo) withClause.memo = true;
      if (options.relations.mediaGallery) {
        if (typeof options.relations.mediaGallery === 'object') {
          const mediaWith: Record<string, boolean> = {};
          if (options.relations.mediaGallery.storageBucket)
            mediaWith.storageBucket = true;
          withClause.mediaGallery = { with: mediaWith };
        } else {
          withClause.mediaGallery = true;
        }
      }
      if (options.relations.authorization) withClause.authorization = true;
    }

    const queryOptions: any = {
      where: eq(calloutFramings.id, calloutFramingID),
    };
    if (Object.keys(withClause).length > 0) {
      queryOptions.with = withClause;
    }

    const calloutFraming =
      await this.db.query.calloutFramings.findFirst(queryOptions);

    if (!calloutFraming)
      throw new EntityNotFoundException(
        `No CalloutFraming found with the given id: ${calloutFramingID}`,
        LogContext.COLLABORATION
      );
    return calloutFraming as unknown as ICalloutFraming;
  }

  public async getProfile(
    calloutFramingInput: ICalloutFraming
  ): Promise<IProfile> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { profile: true },
      }
    );
    if (!calloutFraming.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialized: ${calloutFramingInput.id}`,
        LogContext.COLLABORATION
      );

    return calloutFraming.profile;
  }

  public async getWhiteboard(
    calloutFramingInput: ICalloutFraming
  ): Promise<IWhiteboard | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { whiteboard: true },
      }
    );
    if (!calloutFraming.whiteboard) {
      return null;
    }

    return calloutFraming.whiteboard;
  }

  public async getLink(
    calloutFramingInput: ICalloutFraming
  ): Promise<ILink | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { link: true },
      }
    );
    if (!calloutFraming.link) {
      return null;
    }

    return calloutFraming.link;
  }

  public async getMemo(
    calloutFramingInput: ICalloutFraming
  ): Promise<IMemo | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { memo: true },
      }
    );
    if (!calloutFraming.memo) {
      return null;
    }

    return calloutFraming.memo;
  }

  public async getMediaGallery(
    calloutFramingInput: ICalloutFraming
  ): Promise<IMediaGallery | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { mediaGallery: true },
      }
    );
    if (!calloutFraming.mediaGallery) {
      return null;
    }

    return calloutFraming.mediaGallery;
  }
}
