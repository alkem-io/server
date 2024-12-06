import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
@InputType()
export class RefreshVirtualContributorBodyOfKnowledgeInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Virtual Contributor to update.',
  })
  virtualContributorID!: string;
}
