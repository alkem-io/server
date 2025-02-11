import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConversionVcSpaceToVcKnowledgeBaseInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Virtual Contributor to be converted.',
  })
  virtualContributorID!: string;
}
