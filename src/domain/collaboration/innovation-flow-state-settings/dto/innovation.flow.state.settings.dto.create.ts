import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateInnovationFlowStateSettingsData')
export class CreateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  allowNewCallouts!: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Whether the phase is shown in member-facing navigation. Defaults to true when omitted.',
  })
  visible?: boolean;
}
