import { ProfileService } from '@domain/common/profile/profile.service';
import { Injectable } from '@nestjs/common';
import { CreateCalloutSettingsInput } from './dto/callout.settings.dto.create';
import { UpdateCalloutSettingsInput } from './dto/callout.settings.dto.update';
import { ICalloutSettings } from './callout.settings.interface';
import { CalloutSettings } from './callout.settings.entity';
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
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ICalloutSettingsContribution } from '../callout-settings-contribution/callout.settings.contribution.interface';
import { EntityNotInitializedException } from '@common/exceptions';
import { CalloutSettingsContributionService } from '../callout-settings-contribution/callout.settings.contribution.service';
import { CalloutType } from '@common/enums/callout.type';

@Injectable()
export class CalloutSettingsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutSettingsContributionService: CalloutSettingsContributionService,
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
        calloutSettingsData.contributionPolicy
      );
    calloutSettings.contributionPolicy =
      this.calloutSettingsContributionService.createCalloutSettingsContribution(
        policyData
      );
    /*
    const { profile: profileData, whiteboard, tags } = calloutSettingsData;

    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: tags,
    };

    const tagsetInputs = [defaultTagset];

    calloutSettingsData.profile.tagsets = this.tagsetService.updateTagsetInputs(
      calloutSettings.profile.tagsets,
      tagsetInputs
    );

    calloutSettings.profile = await this.profileService.createProfile(
      profileData,
      ProfileType.CALLOUT_FRAMING,
      storageAggregator
    );

    if (whiteboard) {
      const reservedNameIDs: string[] = []; // no reserved nameIDs for settings
      whiteboard.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${whiteboard.profile?.displayName ?? 'whiteboard'}`,
          reservedNameIDs
        );
      calloutSettings.whiteboard =
        await this.whiteboardService.createWhiteboard(
          whiteboard,
          storageAggregator,
          userID
        );
      await this.profileService.addVisualsOnProfile(
        calloutSettings.whiteboard.profile,
        whiteboard.profile?.visuals,
        [VisualType.BANNER]
      );
    }
    */
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
          /*
           */
        },
      }
    );

    if (calloutSettingsData.contributionPolicy) {
      calloutSettingsEntity.contributionPolicy =
        this.calloutSettingsContributionService.updateCalloutSettingsContribution(
          calloutSettingsEntity.contributionPolicy,
          calloutSettingsData.contributionPolicy
        );
    }
    /*if (calloutSettingsData.profile) {
      calloutSettings.profile = await this.profileService.updateProfile(
        calloutSettings.profile,
        calloutSettingsData.profile
      );
    }

    if (calloutSettings.whiteboard && calloutSettingsData.whiteboardContent) {
      calloutSettings.whiteboard =
        await this.whiteboardService.updateWhiteboardContent(
          calloutSettings.whiteboard.id,
          calloutSettingsData.whiteboardContent
        );
    }*/

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
          contributionPolicy: true,
          /*profile: true,
          whiteboard: true,
          */
        },
      }
    );
    if (calloutSettings.contributionPolicy) {
      await this.calloutSettingsContributionService.delete(
        calloutSettings.contributionPolicy
      );
    }

    /*
    if (calloutSettings.profile) {
      await this.profileService.deleteProfile(calloutSettings.profile.id);
    }

    if (calloutSettings.whiteboard) {
      await this.whiteboardService.deleteWhiteboard(
        calloutSettings.whiteboard.id
      );
    }
    */
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

  public async getContributionPolicy(
    calloutSettingsID: string
  ): Promise<ICalloutSettingsContribution> {
    const callout = await this.getCalloutSettingsOrFail(calloutSettingsID, {
      relations: { contributionPolicy: true },
    });
    if (!callout.contributionPolicy)
      throw new EntityNotInitializedException(
        `Callout Settings (${calloutSettingsID}) not initialised as it does not have contribution policy`,
        LogContext.COLLABORATION
      );
    return callout.contributionPolicy;
  }
  /*
  public async getProfile(
    calloutSettingsInput: ICalloutSettings,
    relations?: FindOptionsRelations<ICalloutSettings>
  ): Promise<IProfile> {
    const calloutSettings = await this.getCalloutSettingsOrFail(
      calloutSettingsInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!calloutSettings.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialized: ${calloutSettingsInput.id}`,
        LogContext.COLLABORATION
      );

    return calloutSettings.profile;
  }

  public async getWhiteboard(
    calloutSettingsInput: ICalloutSettings,
    relations?: FindOptionsRelations<ICalloutSettings>
  ): Promise<IWhiteboard | null> {
    const calloutSettings = await this.getCalloutSettingsOrFail(
      calloutSettingsInput.id,
      {
        relations: { whiteboard: true, ...relations },
      }
    );
    if (!calloutSettings.whiteboard) {
      return null;
    }

    return calloutSettings.whiteboard;
  }
    */
}
