import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class ConversionVcSpaceToVcKnowledgeBaseInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Virtual Contributor to be converted.',
  })
  @IsUUID()
  virtualContributorID!: string;
}
