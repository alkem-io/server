import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { IInnovationFlowStateSettings } from '../innovation-flow-state-settings/innovation.flow.settings.interface';

@ObjectType('InnovationFlowState')
export abstract class IInnovationFlowState extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'The display name for the State',
  })
  displayName!: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The explanation text to clarify the state.',
  })
  description?: string;

  @Field(() => IInnovationFlowStateSettings, {
    nullable: false,
    description: 'The Settings associated with this InnovationFlowState.',
  })
  settings!: IInnovationFlowStateSettings;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this State.',
  })
  sortOrder!: number;

  innovationFlow?: IInnovationFlow;

  // Note: defaultCalloutTemplate is defined only on the entity (not interface)
  // to avoid circular type dependencies with ITemplate. Exposed via resolver.
}
