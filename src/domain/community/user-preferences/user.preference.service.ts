import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EntityNotFoundException } from '@src/common/exceptions';
import {
  LogContext,
  UserPreferenceType,
  UserPreferenceValueType,
} from '@src/common/enums';
import { IUser } from '../user';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';
import { UserPreference } from './user.preference.entity';
import { IUserPreference } from './user.preference.interface';
import { CreateUserPreferenceDefinitionInput } from './dto';
import { getDefaultPreferenceValue, validateValue } from './utils';

@Injectable()
export class UserPreferenceService {
  constructor(
    @InjectRepository(UserPreferenceDefinition)
    private definitionRepository: Repository<UserPreferenceDefinition>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createDefinition(
    definitionData: CreateUserPreferenceDefinitionInput
  ): Promise<IUserPreferenceDefinition> {
    const definition = UserPreferenceDefinition.create(definitionData);

    return await this.definitionRepository.save(definition);
  }

  async definitionExists(
    group: string,
    valueType: UserPreferenceValueType,
    type: UserPreferenceType
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

  async getUserPreferenceOrFail(
    user: IUser,
    type: UserPreferenceType
  ): Promise<IUserPreference> {
    const userPreferenceDefinition = await this.getDefinitionOrFail(type);

    const preference = await this.preferenceRepository.findOne({
      user,
      userPreferenceDefinition,
    });

    if (!preference) {
      throw new EntityNotFoundException(
        `Unable to find preference of type ${type} for user with ID: ${user.id}`,
        LogContext.COMMUNITY
      );
    }

    return preference;
  }

  async getUserPreferencesOrFail(user: IUser): Promise<IUserPreference[]> {
    const preferences = await this.preferenceRepository.find({ user });

    if (!preferences) {
      throw new EntityNotFoundException(
        `Unable to find preferences for user with ID: ${user.id}`,
        LogContext.COMMUNITY
      );
    }

    return preferences;
  }

  async removeUserPreference(
    preference: IUserPreference
  ): Promise<IUserPreference> {
    return await this.preferenceRepository.remove(preference as UserPreference);
  }

  async updateUserPreference(
    user: IUser,
    type: UserPreferenceType,
    value: string
  ) {
    const preference = await this.getUserPreferenceOrFail(user, type);
    const newValue = value;

    if (
      !validateValue(newValue, preference.userPreferenceDefinition.valueType)
    ) {
      throw new TypeError(
        `Expected value of type: ${preference.userPreferenceDefinition.valueType}`
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
