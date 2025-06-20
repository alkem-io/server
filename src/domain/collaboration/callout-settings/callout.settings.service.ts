import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutType } from '@common/enums/callout.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';
import { CalloutSettingsContributionService } from '../callout-settings-contribution/callout.settings.contribution.service';
import { ICalloutSettingsFraming } from '../callout-settings-framing/callout.settings.framing.interface';
import { CalloutSettingsFramingService } from '../callout-settings-framing/callout.settings.framing.service';
import { CalloutSettings } from './callout.settings.entity';
import { ICalloutSettings } from './callout.settings.interface';
import { CreateCalloutSettingsInput } from './dto/callout.settings.dto.create';
import { UpdateCalloutSettingsInput } from './dto/callout.settings.dto.update';

@Injectable()
export class CalloutSettingsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutSettingsContributionService: CalloutSettingsContributionService,
    private calloutSettingsFramingService: CalloutSettingsFramingService,
    /*private profileService: ProfileService,
    private whiteboardService: WhiteboardService,
    private namingService: NamingService,
    private tagsetService: TagsetService,
    */
    @InjectRepository(CalloutSettings)
    private calloutSettingsRepository: Repository<CalloutSettings>
  ) {}

  public async createCalloutSettings(
    calloutSettingsData: CreateCalloutSettingsInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICalloutSettings> {
    /*const calloutSettings: ICalloutSettings =
      CalloutSettings.create(calloutSettingsData);
      */
    const calloutSettings: ICalloutSettings = CalloutSettings.create({
      ...calloutSettingsData,
    });

    calloutSettings.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT_FRAMING
    );

    const policyData =
      this.calloutSettingsContributionService.updateCalloutSettingsContributionInput(
        //!! calloutData.type,
        CalloutType.POST, //!! PASS the calloutSettingsData.framing.type or None
        calloutSettingsData.contribution
      );
    calloutSettings.contribution =
      this.calloutSettingsContributionService.createCalloutSettingsContribution(
        policyData
      );

    return calloutSettings;
  }

  public async updateCalloutSettings(
    calloutSettings: ICalloutSettings,
    calloutSettingsData: UpdateCalloutSettingsInput
  ): Promise<ICalloutSettings> {
    const calloutSettingsEntity = await this.getCalloutSettingsOrFail(
      calloutSettings.id,
      {
        relations: {
          contribution: true,
          framing: true,
        },
      }
    );

    if (calloutSettingsData.framing) {
      calloutSettingsEntity.framing =
        this.calloutSettingsFramingService.updateCalloutSettingsFraming(
          calloutSettingsEntity.framing,
          calloutSettingsData.framing
        );
    }

    if (calloutSettingsData.contribution) {
      calloutSettingsEntity.contribution =
        this.calloutSettingsContributionService.updateCalloutSettingsContribution(
          calloutSettingsEntity.contribution,
          calloutSettingsData.contribution
        );
    }

    if (calloutSettingsData.visibility !== undefined) {
      calloutSettingsEntity.visibility = calloutSettingsData.visibility;
    }
    return await this.calloutSettingsRepository.save(calloutSettingsEntity);
  }

  async delete(
    calloutSettingsInput: ICalloutSettings
  ): Promise<ICalloutSettings> {
    const calloutSettingsID = calloutSettingsInput.id;
    const calloutSettings = await this.getCalloutSettingsOrFail(
      calloutSettingsID,
      {
        relations: {
          contribution: true,
          framing: true,
        },
      }
    );

    if (calloutSettings.framing) {
      await this.calloutSettingsFramingService.delete(calloutSettings.framing);
    }

    if (calloutSettings.contribution) {
      await this.calloutSettingsContributionService.delete(
        calloutSettings.contribution
      );
    }

    if (calloutSettings.authorization) {
      await this.authorizationPolicyService.delete(
        calloutSettings.authorization
      );
    }

    const result = await this.calloutSettingsRepository.remove(
      calloutSettings as CalloutSettings
    );
    result.id = calloutSettingsID;
    return result;
  }

  async save(calloutSettings: ICalloutSettings): Promise<ICalloutSettings> {
    return await this.calloutSettingsRepository.save(calloutSettings);
  }

  public async getCalloutSettingsOrFail(
    calloutSettingsID: string,
    options?: FindOneOptions<CalloutSettings>
  ): Promise<ICalloutSettings | never> {
    const calloutSettings = await this.calloutSettingsRepository.findOne({
      where: { id: calloutSettingsID },
      ...options,
    });

    if (!calloutSettings)
      throw new EntityNotFoundException(
        `No CalloutSettings found with the given id: ${calloutSettingsID}`,
        LogContext.COLLABORATION
      );
    return calloutSettings;
  }

  public async getContributionSettings(
    calloutSettingsID: string
  ): Promise<ICalloutSettingsContribution> {
    const callout = await this.getCalloutSettingsOrFail(calloutSettingsID, {
      relations: { contribution: true },
    });
    if (!callout.contribution)
      throw new EntityNotInitializedException(
        `Callout Settings (${calloutSettingsID}) not initialised as it does not have contribution policy.`,
        LogContext.COLLABORATION
      );
    return callout.contribution;
  }

  public async getFramingSettings(
    calloutSettingsID: string
  ): Promise<ICalloutSettingsFraming> {
    const callout = await this.getCalloutSettingsOrFail(calloutSettingsID, {
      relations: { framing: true },
    });
    if (!callout.framing)
      throw new EntityNotInitializedException(
        `Callout Settings (${calloutSettingsID}) not initialised as it does not have framing policy.`,
        LogContext.COLLABORATION
      );
    return callout.framing;
  }
}
