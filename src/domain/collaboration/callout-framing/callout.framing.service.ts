import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { LinkService } from '@domain/collaboration/link/link.service';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
import { PollService } from '@domain/collaboration/poll/poll.service';
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
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  DeepPartial,
  FindOneOptions,
  FindOptionsRelations,
  Repository,
} from 'typeorm';
import { ILink } from '../link/link.interface';
import { CalloutFraming } from './callout.framing.entity';
import { ICalloutFraming } from './callout.framing.interface';
import { CreateCalloutFramingInput } from './dto/callout.framing.dto.create';
import { UpdateCalloutFramingInput } from './dto/callout.framing.dto.update';

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
    private pollService: PollService,
    private collaboraDocumentService: CollaboraDocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async createCalloutFraming(
    calloutFramingData: CreateCalloutFramingInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutFraming> {
    const calloutFraming: ICalloutFraming = CalloutFraming.create(
      calloutFramingData as DeepPartial<CalloutFraming>
    );

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

    if (calloutFraming.type === CalloutFramingType.POLL) {
      if (!calloutFramingData.poll) {
        throw new ValidationException(
          'Poll input is required when framing type is POLL',
          LogContext.COLLABORATION
        );
      }
      const { poll } = await this.pollService.createPoll(
        calloutFramingData.poll
      );
      calloutFraming.poll = poll;
    }

    if (calloutFraming.type === CalloutFramingType.COLLABORA_DOCUMENT) {
      if (calloutFramingData.collaboraDocument) {
        calloutFraming.collaboraDocument =
          await this.collaboraDocumentService.createCollaboraDocument(
            calloutFramingData.collaboraDocument,
            storageAggregator,
            userID
          );
      } else {
        throw new ValidationException(
          'Callout Framing of type COLLABORA_DOCUMENT requires collaboraDocument data.',
          LogContext.COLLABORATION
        );
      }
    }

    return calloutFraming;
  }

  /**
   * Phase-2 materialization for a CalloutFraming. Composed under a parent
   * (callout, template-callout, etc.); the parent's save persists the
   * framing's bucket before this is called.
   *
   * Walks the framing's own profile and the LINK child if present.
   * Whiteboard and Memo children are self-materializing inside their own
   * createX flows (already saved + materialized). MediaGallery handles
   * its own visuals inline via createMediaGallery (saves the bucket
   * eagerly). Poll has no profile.
   */
  public async materializeCalloutFramingContent(
    calloutFraming: ICalloutFraming,
    calloutFramingData: CreateCalloutFramingInput | undefined,
    rollback: () => Promise<unknown>
  ): Promise<void> {
    if (!calloutFraming.profile) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        {
          calloutFramingId: calloutFraming.id,
          missing: ['profile'],
        }
      );
    }
    if (
      calloutFraming.type === CalloutFramingType.LINK &&
      !calloutFraming.link
    ) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        {
          calloutFramingId: calloutFraming.id,
          missing: ['link'],
        }
      );
    }
    await this.profileService.materializeProfileContentAndVisualsOrRollback(
      calloutFraming.profile,
      calloutFramingData?.profile?.visuals,
      [VisualType.CARD, VisualType.BANNER],
      rollback
    );
    if (
      calloutFraming.type === CalloutFramingType.LINK &&
      calloutFraming.link
    ) {
      await this.linkService.materializeLinkContent(
        calloutFraming.link,
        calloutFramingData?.link,
        rollback
      );
    }
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
    // Memo's framing context wants both CARD (its own default) and BANNER
    // (framing-specific). Pass the union so createMemo materializes both
    // post-save in one shot.
    calloutFraming.memo = await this.memoService.createMemo(
      memoData,
      storageAggregator,
      userID,
      [VisualType.CARD, VisualType.BANNER]
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
        try {
          const newUrl =
            await this.profileDocumentsService.reuploadFileOnStorageBucket(
              visualData.uri,
              calloutFraming.mediaGallery.storageBucket
            );
          if (newUrl) {
            const visual =
              await this.mediaGalleryService.addVisualToMediaGallery(
                calloutFraming.mediaGallery.id,
                visualData.name,
                visualData.sortOrder
              );
            visual.uri = newUrl;
            calloutFraming.mediaGallery.visuals.push(visual);
            await this.mediaGalleryService.saveVisual(visual);
          }
        } catch (error: unknown) {
          const stackTrace =
            error instanceof Error ? error.stack : String(error);
          this.logger.error?.(
            'Failed to add visual to media gallery during callout creation, skipping',
            stackTrace,
            LogContext.COLLABORATION
          );
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

    if (
      calloutFraming.poll &&
      calloutFraming.type !== CalloutFramingType.POLL
    ) {
      await this.pollService.deletePoll(calloutFraming.poll.id);
      calloutFraming.poll = undefined;
    }

    if (
      calloutFraming.collaboraDocument &&
      calloutFraming.type !== CalloutFramingType.COLLABORA_DOCUMENT
    ) {
      await this.collaboraDocumentService.deleteCollaboraDocument(
        calloutFraming.collaboraDocument.id
      );
      calloutFraming.collaboraDocument = undefined;
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
      case CalloutFramingType.POLL: {
        if (!calloutFraming.poll && !calloutFramingData.poll) {
          throw new ValidationException(
            'Poll data is required when switching to POLL framing type',
            LogContext.COLLABORATION
          );
        }
        if (!calloutFraming.poll && calloutFramingData.poll) {
          // Callout framing type transitions are currently read-only in the UI,
          // so this path should not be reached in practice. Throw rather than
          // attempting an unsafe cast from UpdatePollInput to CreatePollInput.
          throw new ValidationException(
            'Cannot create a new poll via callout framing update. Polls must be created with the callout.',
            LogContext.COLLABORATION
          );
        }
        // Poll options are managed via separate mutations (addPollOption,
        // updatePollOption, removePollOption, reorderPollOptions), and
        // PollSettings are readonly after poll creation.
        // Only the poll title can be updated through this path.
        if (
          calloutFraming.poll &&
          calloutFramingData.poll?.title !== undefined
        ) {
          const poll = await this.pollService.getPollOrFail(
            calloutFraming.poll.id
          );
          poll.title = calloutFramingData.poll.title;
          calloutFraming.poll = await this.pollService.save(poll);
        }
        break;
      }
      case CalloutFramingType.COLLABORA_DOCUMENT: {
        // Collabora documents are immutable once created; updates are done
        // through the Collabora editor via WOPI. If the framing was switched
        // to COLLABORA_DOCUMENT and no document exists, create one.
        if (!calloutFraming.collaboraDocument) {
          if (!calloutFramingData.collaboraDocument) {
            throw new ValidationException(
              'Collabora document input is required when switching to COLLABORA_DOCUMENT framing type',
              LogContext.COLLABORATION
            );
          }
          calloutFraming.collaboraDocument =
            await this.collaboraDocumentService.createCollaboraDocument(
              calloutFramingData.collaboraDocument,
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
          poll: true,
          collaboraDocument: true,
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

    if (calloutFraming.poll) {
      await this.pollService.deletePoll(calloutFraming.poll.id);
    }

    if (calloutFraming.collaboraDocument) {
      await this.collaboraDocumentService.deleteCollaboraDocument(
        calloutFraming.collaboraDocument.id
      );
    }

    if (calloutFraming.authorization) {
      await this.authorizationPolicyService.delete(
        calloutFraming.authorization
      );
    }

    const result = await this.calloutFramingRepository.remove(
      calloutFraming as CalloutFraming
    );
    result.id = calloutFramingID;
    return result;
  }

  async save(calloutFraming: ICalloutFraming): Promise<ICalloutFraming> {
    return await this.calloutFramingRepository.save(calloutFraming);
  }

  public async getCalloutFramingOrFail(
    calloutFramingID: string,
    options?: FindOneOptions<CalloutFraming>
  ): Promise<ICalloutFraming | never> {
    const calloutFraming = await this.calloutFramingRepository.findOne({
      where: { id: calloutFramingID },
      ...options,
    });

    if (!calloutFraming)
      throw new EntityNotFoundException(
        'No CalloutFraming found with the given id',
        LogContext.COLLABORATION,
        { calloutFramingID }
      );
    return calloutFraming;
  }

  public async getProfile(
    calloutFramingInput: ICalloutFraming,
    relations?: FindOptionsRelations<ICalloutFraming>
  ): Promise<IProfile> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!calloutFraming.profile)
      throw new EntityNotFoundException(
        'Callout profile not initialized',
        LogContext.COLLABORATION,
        { calloutFramingID: calloutFramingInput.id }
      );

    return calloutFraming.profile;
  }

  public async getWhiteboard(
    calloutFramingInput: ICalloutFraming,
    relations?: FindOptionsRelations<ICalloutFraming>
  ): Promise<IWhiteboard | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { whiteboard: true, ...relations },
      }
    );
    if (!calloutFraming.whiteboard) {
      return null;
    }

    return calloutFraming.whiteboard;
  }

  public async getLink(
    calloutFramingInput: ICalloutFraming,
    relations?: FindOptionsRelations<ICalloutFraming>
  ): Promise<ILink | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { link: true, ...relations },
      }
    );
    if (!calloutFraming.link) {
      return null;
    }

    return calloutFraming.link;
  }

  public async getMemo(
    calloutFramingInput: ICalloutFraming,
    relations?: FindOptionsRelations<ICalloutFraming>
  ): Promise<IMemo | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { memo: true, ...relations },
      }
    );
    if (!calloutFraming.memo) {
      return null;
    }

    return calloutFraming.memo;
  }

  public async getPoll(
    calloutFramingInput: ICalloutFraming
  ): Promise<IPoll | null> {
    return this.pollService.getPollForFraming(calloutFramingInput.id);
  }

  public async getCollaboraDocument(
    calloutFramingInput: ICalloutFraming
  ): Promise<ICollaboraDocument | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { collaboraDocument: true },
      }
    );
    return calloutFraming.collaboraDocument ?? null;
  }

  public async getMediaGallery(
    calloutFramingInput: ICalloutFraming,
    relations?: FindOptionsRelations<ICalloutFraming>
  ): Promise<IMediaGallery | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { mediaGallery: true, ...relations },
      }
    );
    if (!calloutFraming.mediaGallery) {
      return null;
    }

    return calloutFraming.mediaGallery;
  }
}
