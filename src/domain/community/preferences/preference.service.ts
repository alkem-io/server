import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserPreferenceDefinition } from './preference.definition.entity';
import { IUserPreferenceDefinition } from '@domain/community/preferences/preference.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { UserPreferenceType, UserPreferenceValueType } from '@src/common';

type CreateUserPreferenceDefinitionInput = {
  group: string;
  displayName: string;
  description: string;
  valueType: UserPreferenceValueType;
  type: UserPreferenceType;
};

@Injectable()
export class UserPreferenceService {
  constructor(
    // @InjectRepository(UserPreferenceDefinition)
    // private definitionRepository: Repository<UserPreferenceDefinition>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createDefinition(
    definitionData: CreateUserPreferenceDefinitionInput
  ): Promise<IUserPreferenceDefinition> {
    const definition: IUserPreferenceDefinition =
      UserPreferenceDefinition.create(definitionData);

    definition.authorization = new AuthorizationPolicy();
    return {} as IUserPreferenceDefinition;
    // return this.definitionRepository.save(definition);
  }
}
