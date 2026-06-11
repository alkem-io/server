import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether new callouts can be added to this State; omission leaves the stored value unchanged.',
  })
  allowNewCallouts?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether the phase is shown in member-facing navigation; omission leaves the stored value unchanged.',
  })
  visible?: boolean;
}
