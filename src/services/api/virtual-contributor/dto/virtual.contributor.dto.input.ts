import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualContributorInput {
  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Prompt.',
  })
  prompt!: string;
}
