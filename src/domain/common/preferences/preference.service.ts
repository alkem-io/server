import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotFoundException } from '@src/common/exceptions';
import {
  LogContext,
  UserPreferenceType,
  PreferenceValueType,
} from '@src/common/enums';
import { PreferenceDefinition } from './preference.definition.entity';
import { IPreferenceDefinition } from './preference.definition.interface';
import { Preference } from './preference.entity';
import { IPreference } from './preference.interface';
import { getDefaultPreferenceValue, validateValue } from './utils';
import { CreatePreferenceDefinitionInput } from './dto/preference-definition.dto.create';
import { IUser } from '@domain/community/user/user.interface';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectRepository(PreferenceDefinition)
    private definitionRepository: Repository<PreferenceDefinition>,
    @InjectRepository(Preference)
    private preferenceRepository: Repository<Preference>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createDefinition(
    definitionData: CreatePreferenceDefinitionInput
  ): Promise<IPreferenceDefinition> {
    const definition = PreferenceDefinition.create(definitionData);

    return await this.definitionRepository.save(definition);
  }

  async definitionExists(
    group: string,
    valueType: PreferenceValueType,
    type: string
  ) {
    const res = await this.definitionRepository.findOne({
      group,
      type,
      valueType,
    });
    return Boolean(res);
  }

  async createInitialUserPreferences(user: IUser) {
    // todo: probably define which definition types/groups to fetch
    const definitions = await this.getAllDefinitions();

    const prefInputs = definitions.map(def => ({
      userPreferenceDefinition: def,
      value: getDefaultPreferenceValue(def.valueType),
      user,
    }));

    const newPreferences = this.preferenceRepository.create(prefInputs);

    newPreferences.forEach(
      pref => (pref.authorization = new AuthorizationPolicy())
    );

    return await this.preferenceRepository.save(newPreferences);
  }

  async getPreferenceOrFail(peferenceID: string): Promise<IPreference> {
    const reference = await this.preferenceRepository.findOne({
      id: peferenceID,
    });
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate preference with the specified ID: ${peferenceID}`,
        LogContext.CHALLENGES
      );
    return reference;
  }

  async getUserXPreferenceOrFail(
    user: IUser,
    type: UserPreferenceType
  ): Promise<IPreference> {
    const userPreferenceDefinition = await this.getDefinitionOrFail(type);

    const preference = await this.preferenceRepository.findOne({
      user,
      preferenceDefinition: userPreferenceDefinition,
    });

    if (!preference) {
      throw new EntityNotFoundException(
        `Unable to find preference of type ${type} for user with ID: ${user.id}`,
        LogContext.COMMUNITY
      );
    }

    return preference;
  }

  async getUserPreferencesOrFail(user: IUser): Promise<IPreference[]> {
    const preferences = await this.preferenceRepository.find({ user });

    if (!preferences) {
      throw new EntityNotFoundException(
        `Unable to find preferences for user with ID: ${user.id}`,
        LogContext.COMMUNITY
      );
    }

    return preferences;
  }

  async removeUserPreference(preference: IPreference): Promise<IPreference> {
    return await this.preferenceRepository.remove(preference as Preference);
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

  private async getDefinitionOrFail(type: UserPreferenceType) {
    const definition = await this.definitionRepository.findOne({
      type,
    });

    if (!definition) {
      throw new EntityNotFoundException(
        `Unable to fine preference definition of type ${type}`,
        LogContext.COMMUNITY
      );
    }

    return definition;
  }

  private async getAllDefinitions() {
    return await this.definitionRepository.find();
  }
}
