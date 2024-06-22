import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotFoundException,
  ValidationException,
} from '@src/common/exceptions';
import {
  LogContext,
  PreferenceValueType,
  UserPreferenceType,
} from '@src/common/enums';
import { PreferenceDefinition } from './preference.definition.entity';
import { IPreferenceDefinition } from './preference.definition.interface';
import { Preference } from './preference.entity';
import { IPreference } from './preference.interface';
import { getDefaultPreferenceValue, validateValue } from './utils';
import { CreatePreferenceDefinitionInput } from './dto/preference-definition.dto.create';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';

@Injectable()
export class PreferenceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(PreferenceDefinition)
    private definitionRepository: Repository<PreferenceDefinition>,
    @InjectRepository(Preference)
    private preferenceRepository: Repository<Preference>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createPreference(
    definition: IPreferenceDefinition,
    defaults: Map<PreferenceType, string>
  ): Promise<IPreference> {
    const preference: IPreference = new Preference();
    preference.preferenceDefinition = definition;
    const defaultValue = defaults.get(definition.type);
    if (defaultValue) {
      preference.value = defaultValue;
    } else {
      preference.value = this.getDefaultPreferenceValue(definition.valueType);
    }
    preference.authorization = new AuthorizationPolicy();
    return await this.preferenceRepository.save(preference);
  }

  async createDefinition(
    definitionData: CreatePreferenceDefinitionInput
  ): Promise<IPreferenceDefinition> {
    const definition = PreferenceDefinition.create({ ...definitionData });

    return await this.definitionRepository.save(definition);
  }

  async definitionExists(
    group: string,
    valueType: PreferenceValueType,
    type: UserPreferenceType
  ) {
    const res = await this.definitionRepository.findOneBy({
      group,
      type,
      valueType,
    });
    return Boolean(res);
  }

  getDefaultPreferenceValue(valueType: PreferenceValueType) {
    return getDefaultPreferenceValue(valueType);
  }

  async getPreferenceOrFail(
    preferenceID: string,
    options?: FindOneOptions<Preference>
  ): Promise<IPreference> {
    const reference = await this.preferenceRepository.findOne({
      where: { id: preferenceID },
      ...options,
    });
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate preference with the specified ID: ${preferenceID}`,
        LogContext.SPACES
      );
    return reference;
  }

  async removePreference(preferenceID: string): Promise<IPreference> {
    const preference = await this.getPreferenceOrFail(preferenceID);
    if (preference.authorization)
      await this.authorizationPolicyService.delete(preference.authorization);

    const result = await this.preferenceRepository.remove(
      preference as Preference
    );
    return {
      ...result,
      id: preferenceID,
    };
  }

  async updatePreference(preference: IPreference, value: string) {
    const newValue = value;

    if (!validateValue(newValue, preference.preferenceDefinition.valueType)) {
      throw new TypeError(
        `Expected value of type: ${preference.preferenceDefinition.valueType}`
      );
    }

    if (newValue !== preference.value) {
      preference.value = newValue;
      return await this.preferenceRepository.save(preference);
    }

    return preference;
  }

  validatePreferenceTypeOrFail(
    preference: IPreference,
    definitionSet: PreferenceDefinitionSet
  ) {
    if (preference.preferenceDefinition.definitionSet !== definitionSet) {
      throw new ValidationException(
        `Expected preference to be in the following definition set: ${definitionSet}`,
        LogContext.SPACES
      );
    }
  }

  async getAllDefinitionsInSet(
    definitionSet: PreferenceDefinitionSet
  ): Promise<IPreferenceDefinition[]> {
    return await this.definitionRepository.findBy({
      definitionSet: definitionSet,
    });
  }
}
