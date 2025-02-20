import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';

@ObjectType('InnovationFlow')
export abstract class IInnovationFlow extends IAuthorizable {
  profile!: IProfile;

  states!: string;

  @Field(() => IInnovationFlowSettings, {
    nullable: false,
    description: 'The settings for this InnovationFlow.',
  })
  settings!: IInnovationFlowSettings;
}
