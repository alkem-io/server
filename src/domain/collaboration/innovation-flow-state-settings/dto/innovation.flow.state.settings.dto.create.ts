import { InputType, Field, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateInnovationFlowStateSettingsData')
export class CreateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  someFlag!: boolean;
}
