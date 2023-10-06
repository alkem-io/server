import { ProfileService } from '@domain/common/profile/profile.service';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { ProfileType } from '@common/enums';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt/whiteboard.rt.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { IWhiteboard } from '@domain/common/whiteboard';

@Injectable()
export class CalloutFramingService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private profileService: ProfileService,
    private whiteboardService: WhiteboardService,
    private whiteboardRtService: WhiteboardRtService,
    @InjectRepository(CalloutFraming)
    private calloutFramingRepository: Repository<CalloutFraming>
  ) {}

  public async createCalloutFraming(
    calloutFramingData: CreateCalloutFramingInput,
    parentStorageBucket: IStorageBucket,
    userID?: string
  ): Promise<ICalloutFraming> {
    const calloutFraming: ICalloutFraming =
      CalloutFraming.create(calloutFramingData);

    calloutFraming.authorization = new AuthorizationPolicy();

    const { profile, whiteboard, whiteboardRt } = calloutFramingData;

    calloutFraming.profile = await this.profileService.createProfile(
      profile,
      ProfileType.CALLOUT_FRAMING,
      parentStorageBucket
    );

    if (whiteboard) {
      calloutFraming.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        parentStorageBucket,
        userID
      );
    }

    if (whiteboardRt) {
      calloutFraming.whiteboardRt =
        await this.whiteboardRtService.createWhiteboardRt(
          whiteboardRt,
          parentStorageBucket,
          userID
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
        relations: ['profile', ...relations],
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
  ): Promise<IWhiteboard> {
    const calloutFraming = await this.getCalloutFramingOrFail(
      calloutFramingInput.id,
      {
        relations: ['whiteboard', ...relations],
      }
    );
    if (!calloutFraming.whiteboard)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${calloutFramingInput.id}`,
        LogContext.COLLABORATION
      );

    return calloutFraming.whiteboard;
  }
}
