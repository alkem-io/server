import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class RefreshVirtualContributorBodyOfKnowledgeInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Virtual Contributor to update.',
  })
  virtualContributorID!: string;
}
