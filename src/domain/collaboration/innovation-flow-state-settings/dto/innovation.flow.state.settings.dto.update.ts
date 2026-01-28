import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  allowNewCallouts!: boolean;
}
