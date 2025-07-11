import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';

@ObjectType('InnovationFlow')
export abstract class IInnovationFlow extends IAuthorizable {
  profile!: IProfile;

  @Field(() => [IInnovationFlowState], {
    nullable: false,
    description: 'The set of States in use in this Flow.',
  })
  states!: IInnovationFlowState[];

  @Field(() => IInnovationFlowState, {
    nullable: false,
    description: 'The currently selected State in this Flow.',
  })
  currentState!: IInnovationFlowState;

  @Field(() => IInnovationFlowSettings, {
    nullable: false,
    description: 'The settings for this InnovationFlow.',
  })
  settings!: IInnovationFlowSettings;

  flowStatesTagsetTemplate!: ITagsetTemplate;
}
