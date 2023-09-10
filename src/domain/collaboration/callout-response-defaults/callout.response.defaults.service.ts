import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateCalloutResponseDefaultsInput } from './dto/callout.response.defaults.dto.create';
import { UpdateCalloutResponseDefaultsInput } from './dto/callout.response.defaults.dto.update';
import { ICalloutResponseDefaults } from './callout.response.defaults.interface';
import { CalloutResponseDefaults } from './callout.response.defaults.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CalloutResponseDefaultsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CalloutResponseDefaults)
    private calloutResponseDefaultsRepository: Repository<CalloutResponseDefaults>
  ) {}

  async createCalloutResponseDefaults(
    calloutResponseDefaultsData: CreateCalloutResponseDefaultsInput
  ): Promise<ICalloutResponseDefaults> {
    const calloutResponseDefaults = new CalloutResponseDefaults();
    if (calloutResponseDefaultsData.postDescription) {
      calloutResponseDefaults.postDescription =
        calloutResponseDefaultsData.postDescription;
    }

    if (calloutResponseDefaultsData.whiteboardContent) {
      calloutResponseDefaults.whiteboardContent =
        calloutResponseDefaultsData.whiteboardContent;
    }

    return calloutResponseDefaults;
  }

  async updateCalloutResponseDefaults(
    calloutResponseDefaults: ICalloutResponseDefaults,
    calloutResponseDefaultsData: UpdateCalloutResponseDefaultsInput
  ): Promise<ICalloutResponseDefaults> {
    if (calloutResponseDefaultsData.postDescription) {
      calloutResponseDefaults.postDescription =
        calloutResponseDefaultsData.postDescription;
    }

    return calloutResponseDefaults;
  }

  async delete(
    calloutResponseDefaults: ICalloutResponseDefaults
  ): Promise<ICalloutResponseDefaults> {
    const calloutResponseDefaultsID = calloutResponseDefaults.id;
    const result = await this.calloutResponseDefaultsRepository.remove(
      calloutResponseDefaults as CalloutResponseDefaults
    );
    result.id = calloutResponseDefaultsID;
    return result;
  }

  async save(
    calloutResponseDefaults: ICalloutResponseDefaults
  ): Promise<ICalloutResponseDefaults> {
    return await this.calloutResponseDefaultsRepository.save(
      calloutResponseDefaults
    );
  }
}
