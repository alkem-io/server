import { ProfileService } from '@domain/common/profile/profile.service';
import { Injectable } from '@nestjs/common';
import { CreateCalloutFramingInput } from './dto/callout.framing.dto.create';
import { UpdateCalloutFramingInput } from './dto/callout.framing.dto.update';
import { ICalloutFraming } from './callout.framing.interface';
import { CalloutFraming } from './callout.framing.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileType } from '@common/enums';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt/whiteboard.rt.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { IWhiteboard } from '@domain/common/whiteboard';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.interface';
import { VisualType } from '@common/enums/visual.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Injectable()
export class CalloutFramingService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private whiteboardService: WhiteboardService,
    private whiteboardRtService: WhiteboardRtService,
    private namingService: NamingService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async createCalloutFraming(
    calloutFramingData: CreateCalloutFramingInput,
    tagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutFraming> {
    const calloutFraming: ICalloutFraming =
      CalloutFraming.create(calloutFramingData);

    calloutFraming.authorization = new AuthorizationPolicy();

    const { profile, whiteboard, whiteboardRt, tags } = calloutFramingData;

    // To consider also having the default tagset as a template tagset
    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: tags,
    };

    const tagsetInputsFromTemplates =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );
    const tagsetInputs = [defaultTagset, ...tagsetInputsFromTemplates];

    calloutFramingData.profile.tagsets =
      this.profileService.updateProfileTagsetInputs(
        calloutFraming.profile.tagsets,
        tagsetInputs
      );

    calloutFraming.profile = await this.profileService.createProfile(
      profile,
      ProfileType.CALLOUT_FRAMING,
      storageAggregator
    );

    if (whiteboard) {
      whiteboard.nameID = this.namingService.createNameID(
        `${whiteboard.profileData.displayName}`
      );
      calloutFraming.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        storageAggregator,
        userID
      );
      await this.profileService.addVisualOnProfile(
        calloutFraming.whiteboard.profile,
        VisualType.BANNER
      );
    }

    if (whiteboardRt) {
      whiteboardRt.nameID = this.namingService.createNameID(
        `${whiteboardRt.profileData.displayName}`
      );
      calloutFraming.whiteboardRt =
        await this.whiteboardRtService.createWhiteboardRt(
          whiteboardRt,
          storageAggregator,
          userID
        );
      await this.profileService.addVisualOnProfile(
        calloutFraming.whiteboardRt.profile,
        VisualType.BANNER
      );
    }

    return calloutFraming;
  }

  public async updateCalloutFraming(
    calloutFraming: ICalloutFraming,
    calloutFramingData: UpdateCalloutFramingInput,
    agentInfo: AgentInfo
  ): Promise<ICalloutFraming> {
    if (calloutFramingData.profile) {
      calloutFraming.profile = await this.profileService.updateProfile(
        calloutFraming.profile,
        calloutFramingData.profile
      );
    }

    if (calloutFraming.whiteboard && calloutFramingData.whiteboard) {
      calloutFraming.whiteboard = await this.whiteboardService.updateWhiteboard(
        calloutFraming.whiteboard,
        calloutFramingData.whiteboard,
        agentInfo
      );
    }

    if (calloutFraming.whiteboardRt && calloutFramingData.whiteboardRt) {
      calloutFraming.whiteboardRt =
        await this.whiteboardRtService.updateWhiteboardRt(
          calloutFraming.whiteboardRt,
          calloutFramingData.whiteboardRt
        );
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

    if (calloutFraming.whiteboardRt) {
      await this.whiteboardRtService.deleteWhiteboardRt(
        calloutFraming.whiteboardRt.id
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
    let calloutFraming: ICalloutFraming | null = null;
    if (calloutFramingID.length === UUID_LENGTH) {
      calloutFraming = await this.calloutFramingRepository.findOne({
        where: { id: calloutFramingID },
        ...options,
      });
    }

    if (!calloutFraming)
      throw new EntityNotFoundException(
        `No CalloutFraming found with the given id: ${calloutFramingID}`,
        LogContext.COLLABORATION
      );
    return calloutFraming;
  }

  public async getProfile(
    calloutFramingInput: ICalloutFraming,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!calloutFraming.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${calloutFramingInput.id}`,
        LogContext.COLLABORATION
      );

    return calloutFraming.profile;
  }

  public async getWhiteboard(
    calloutFramingInput: ICalloutFraming,
    relations: FindOptionsRelationByString = []
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

  public async getWhiteboardRt(
    calloutFramingInput: ICalloutFraming,
    relations: FindOptionsRelationByString = []
  ): Promise<IWhiteboardRt | null> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: { whiteboardRt: true, ...relations },
      }
    );
    if (!calloutFraming.whiteboardRt) {
      return null;
    }

    return calloutFraming.whiteboardRt;
  }

  updateDisplayLocationTagsetValue(
    framing: ICalloutFraming,
    group: CalloutDisplayLocation
  ) {
    const displayLocationTagset = framing.profile.tagsets?.find(
      tagset => tagset.name === TagsetReservedName.CALLOUT_DISPLAY_LOCATION
    );
    if (!displayLocationTagset) {
      throw new EntityNotFoundException(
        `Callout display location tagset not found for profile: ${framing.profile.id}`,
        LogContext.TAGSET
      );
    }
    displayLocationTagset.tags = [group];
  }
}
