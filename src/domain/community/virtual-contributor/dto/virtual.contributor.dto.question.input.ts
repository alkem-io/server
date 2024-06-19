import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VirtualContributorQuestionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Contributor to be asked.',
  })
  virtualContributorID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question that is being asked.',
  })
  question!: string;
}
