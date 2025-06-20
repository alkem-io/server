import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCalloutSettingsFramingInput } from './dto';
import { UpdateCalloutSettingsFramingInput } from './dto';
import { ICalloutSettingsFraming } from './callout.settings.framing.interface';
import { CalloutSettingsFraming } from './callout.settings.framing.entity';
import { CalloutFramingType } from '@common/enums/callout.framing.type';

@Injectable()
export class CalloutSettingsFramingService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutSettingsFraming)
    private calloutSettingsFramingRepository: Repository<CalloutSettingsFraming>
  ) {}

  public createCalloutSettingsFraming(
    calloutSettingsFramingData: CreateCalloutSettingsFramingInput
  ): ICalloutSettingsFraming {
    const calloutSettingsFraming = new CalloutSettingsFraming();

    calloutSettingsFraming.type =
      calloutSettingsFramingData.type ?? CalloutFramingType.NONE;

    calloutSettingsFraming.commentsEnabled =
      calloutSettingsFramingData.commentsEnabled ?? false;

    return calloutSettingsFraming;
  }

  public updateCalloutSettingsFraming(
    calloutSettingsFraming: ICalloutSettingsFraming,
    calloutSettingsFramingData: UpdateCalloutSettingsFramingInput
  ): ICalloutSettingsFraming {
    if (calloutSettingsFramingData.type) {
      calloutSettingsFraming.type = calloutSettingsFramingData.type;
    }

    if (calloutSettingsFramingData.commentsEnabled) {
      calloutSettingsFraming.commentsEnabled =
        calloutSettingsFramingData.commentsEnabled;
    }

    return calloutSettingsFraming;
  }

  public async delete(
    calloutSettingsFraming: ICalloutSettingsFraming
  ): Promise<ICalloutSettingsFraming> {
    const calloutSettingsFramingID = calloutSettingsFraming.id;
    const result = await this.calloutSettingsFramingRepository.remove(
      calloutSettingsFraming as CalloutSettingsFraming
    );
    result.id = calloutSettingsFramingID;
    return result;
  }
}
