import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import {
  EntityNotFoundException,
  LogContext,
  UserPreferenceType,
  UserPreferenceValueType,
} from '@src/common';
import { IUser } from '../user';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';
import { UserPreference } from './user.preference.entity';
import { IUserPreference } from './user.preference.interface';
import { CreateUserPreferenceDefinitionInput } from './dto';
import { getDefaultPreferenceValue } from './utils';

@Injectable()
export class UserPreferenceService {
  constructor(
    @InjectRepository(UserPreferenceDefinition)
    private definitionRepository: Repository<UserPreferenceDefinition>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
    // private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createDefinition(
    definitionData: CreateUserPreferenceDefinitionInput
  ): Promise<IUserPreferenceDefinition> {
    const definition = UserPreferenceDefinition.create(definitionData);
    definition.authorization = new AuthorizationPolicy();

    return this.definitionRepository.save(definition);
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

  private getAllDefinitions() {
    return this.definitionRepository.find();
  }

  /**
   * Creates user preferences
   */
  async createInitialUserPreferences(user: IUser) {
    // todo: probably define which definition types/groups to create
    return (
      this.getAllDefinitions()
        .then(defs =>
          defs.map(def => ({
            userPreferenceDefinition: def,
            value: getDefaultPreferenceValue(def.valueType),
            user,
          }))
        )
        .then(prefInputs => this.preferenceRepository.create(prefInputs))
        .then(prefs => {
          prefs.forEach(
            pref => (pref.authorization = new AuthorizationPolicy())
          );
          return prefs;
        })
        // todo apply user credentials
        .then(prefs => this.preferenceRepository.save(prefs))
    );
  }

  async getUserPreferenceOrFail(
    id: string,
    options?: FindOneOptions<UserPreference>
  ): Promise<IUserPreference> {
    const preference = await this.preferenceRepository.findOne({ id }, options);

    if (!preference) {
      throw new EntityNotFoundException(
        `Unable to find user preference with ID: ${id}`,
        LogContext.COMMUNITY
      );
    }

    return preference;
  }

  // async updateUserPreferences(updateInputs: UpdateUserPreferenceInput[]) {
  //   // todo: get all preferences in input
  // }

  // private async updateUserPreference(updateInput: UpdateUserPreferenceInput) {
  //   const preference = await this.getUserPreferenceOrFail(updateInput.ID);
  //
  //   const newValue = updateInput.value;
  //
  //   if (
  //     !validateValue(newValue, preference.userPreferenceDefinition.valueType)
  //   ) {
  //     throw new TypeError(
  //       `Expected type of value: ${preference.userPreferenceDefinition.valueType}`
  //     );
  //   }
  //
  //   if (newValue !== preference.value) {
  //     preference.value = newValue;
  //   }
  // }
}
