import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PreferenceSet } from './preference.set.entity';
import { PreferenceService } from '../preference/preference.service';
import { IPreferenceSet } from '.';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { IPreference } from '../preference/preference.interface';

@Injectable()
export class PreferenceSetService {
  constructor(
    private preferenceService: PreferenceService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(PreferenceSet)
    private preferenceSetRepository: Repository<PreferenceSet>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createPreferenceSet(
    preferenceDefinitionSet: PreferenceDefinitionSet,
    preferenceDefaults: Map<PreferenceType, string>
  ): Promise<IPreferenceSet> {
    const preferenceSet: IPreferenceSet = PreferenceSet.create();
    preferenceSet.authorization = new AuthorizationPolicy();
    preferenceSet.preferences = [];
    const definitions = await this.preferenceService.getAllDefinitionsInSet(
      preferenceDefinitionSet
    );
    for (const definition of definitions) {
      const preference = await this.preferenceService.createPreference(
        definition,
        preferenceDefaults
      );
      preferenceSet.preferences.push(preference);
    }
    return preferenceSet;
  }

  async deletePreferenceSet(preferenceSetID: string): Promise<IPreferenceSet> {
    // Note need to load it in with all contained entities so can remove fully
    const preferenceSet = await this.getPreferenceSetOrFail(preferenceSetID, {
      relations: [],
    });

    if (preferenceSet.preferences) {
      for (const preference of preferenceSet.preferences) {
        await this.preferenceService.removePreference(preference);
      }
    }

    if (preferenceSet.authorization)
      await this.authorizationPolicyService.delete(preferenceSet.authorization);

    return await this.preferenceSetRepository.remove(
      preferenceSet as PreferenceSet
    );
  }

  async getPreferenceSetOrFail(
    preferenceSetID: string,
    options?: FindOneOptions<PreferenceSet>
  ): Promise<IPreferenceSet | never> {
    const preferenceSet = await PreferenceSet.findOne({
      where: { id: preferenceSetID },
      ...options,
    });
    if (!preferenceSet)
      throw new EntityNotFoundException(
        `PreferenceSet with id(${preferenceSetID}) not found!`,
        LogContext.COMMUNITY
      );
    return preferenceSet;
  }

  getPreferencesOrFail(preferenceSet: IPreferenceSet): IPreference[] {
    const preferences = preferenceSet.preferences;
    if (!preferences) {
      throw new EntityNotFoundException(
        `Unable to obtain preferences on PreferenceSet: ${preferenceSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return preferences;
  }

  getPreferenceOrFail(
    preferenceSet: IPreferenceSet,
    type: PreferenceType
  ): IPreference {
    const preferences = this.getPreferencesOrFail(preferenceSet);
    const preference = preferences.find(
      preference => preference.preferenceDefinition.type === type.toString()
    );

    if (!preference) {
      throw new EntityNotFoundException(
        `Unable to find preference of type ${type} for preferenceSet with ID: ${preferenceSet.id}`,
        LogContext.COMMUNITY
      );
    }

    return preference;
  }

  getPreferenceValue(
    preferenceSet: IPreferenceSet,
    type: PreferenceType
  ): boolean {
    const preference = this.getPreferenceOrFail(preferenceSet, type);
    return preference.value === 'true';
  }
}
