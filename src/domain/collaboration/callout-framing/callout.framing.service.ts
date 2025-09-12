import { ProfileService } from '@domain/common/profile/profile.service';
import { Injectable } from '@nestjs/common';
import { CreateCalloutFramingInput } from './dto/callout.framing.dto.create';
import { UpdateCalloutFramingInput } from './dto/callout.framing.dto.update';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileType } from '@common/enums';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { LinkService } from '@domain/collaboration/link/link.service';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { MemoService } from '@domain/common/memo/memo.service';
import { VisualType } from '@common/enums/visual.type';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { ValidationException } from '@common/exceptions';
import { CreateMemoInput, IMemo } from '@domain/common/memo/types';
import { ILink } from '../link/link.interface';

@Injectable()
export class CalloutFramingService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private whiteboardService: WhiteboardService,
    private linkService: LinkService,
    private memoService: MemoService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async createCalloutFraming(
    calloutFramingData: CreateCalloutFramingInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutFraming> {
    const calloutFraming: ICalloutFraming =
      CalloutFraming.create(calloutFramingData);

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
    await this.profileService.addVisualsOnProfile(
      calloutFraming.whiteboard.profile,
      whiteboardData.profile?.visuals,
      [VisualType.BANNER]
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

    switch (calloutFraming.type) {
      case CalloutFramingType.WHITEBOARD: {
        // If there was a memo before, we delete it
        if (calloutFraming.memo) {
          await this.memoService.deleteMemo(calloutFraming.memo.id);
          calloutFraming.memo = undefined;
        }

        // If there was a link before, we delete it
        if (calloutFraming.link) {
          await this.linkService.deleteLink(calloutFraming.link.id);
          calloutFraming.link = undefined;
        }

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
        } else {
          // if there is content and no whiteboard, we create a new one
          await this.createNewWhiteboardInCalloutFraming(
            calloutFraming,
            {
              profile: {
                displayName: 'Callout Framing Whiteboard',
              },
              content: calloutFramingData.whiteboardContent,
            },
            storageAggregator,
            userID
          );
        }
        break;
      }
      case CalloutFramingType.MEMO: {
        // If there was a whiteboard before, we delete it
        if (calloutFraming.whiteboard) {
          await this.whiteboardService.deleteWhiteboard(
            calloutFraming.whiteboard.id
          );
          calloutFraming.whiteboard = undefined;
        }

        // If there was a link before, we delete it
        if (calloutFraming.link) {
          await this.linkService.deleteLink(calloutFraming.link.id);
          calloutFraming.link = undefined;
        }

        // if there is no content coming with the mutation, we do nothing with the whiteboard
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
        // If there was a whiteboard before, we delete it
        if (calloutFraming.whiteboard) {
          await this.whiteboardService.deleteWhiteboard(
            calloutFraming.whiteboard.id
          );
          calloutFraming.whiteboard = undefined;
        }

        // If there was a memo before, we delete it
        if (calloutFraming.memo) {
          await this.memoService.deleteMemo(calloutFraming.memo.id);
          calloutFraming.memo = undefined;
        }

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
      case CalloutFramingType.NONE:
      default: {
        // if the type is NONE we remove any existing framing content
        if (calloutFraming.whiteboard) {
          await this.whiteboardService.deleteWhiteboard(
            calloutFraming.whiteboard.id
          );
          calloutFraming.whiteboard = undefined;
        }
        if (calloutFraming.memo) {
          await this.memoService.deleteMemo(calloutFraming.memo.id);
          calloutFraming.memo = undefined;
        }
        if (calloutFraming.link) {
          await this.linkService.deleteLink(calloutFraming.link.id);
          calloutFraming.link = undefined;
        }
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
        `No CalloutFraming found with the given id: ${calloutFramingID}`,
        LogContext.COLLABORATION
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
        `Callout profile not initialized: ${calloutFramingInput.id}`,
        LogContext.COLLABORATION
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
}
