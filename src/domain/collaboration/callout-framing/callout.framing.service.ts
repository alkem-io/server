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
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
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
import { ValidationException } from '@common/exceptions';

@Injectable()
export class CalloutFramingService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private whiteboardService: WhiteboardService,
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

  public async updateCalloutFraming(
    calloutFraming: ICalloutFraming,
    calloutFramingData: UpdateCalloutFramingInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutFraming> {
    if (calloutFramingData.profile) {
      calloutFraming.profile = await this.profileService.updateProfile(
        calloutFraming.profile,
        calloutFramingData.profile
      );
    }
    if (calloutFramingData.type) {
      calloutFraming.type = calloutFramingData.type;
    }

    if (calloutFraming.type === CalloutFramingType.WHITEBOARD) {
      // if there is no content, we do anything with the whiteboard
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
    } else {
      // if the type is not WHITEBOARD, we remove the whiteboard if it exists
      if (calloutFraming.whiteboard) {
        await this.whiteboardService.deleteWhiteboard(
          calloutFraming.whiteboard.id
        );
        calloutFraming.whiteboard = undefined;
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
}
