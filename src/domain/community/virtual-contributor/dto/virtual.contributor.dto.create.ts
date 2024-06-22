import { Field, InputType } from '@nestjs/graphql';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { BodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => UUID, { nullable: true })
  virtualPersonaID?: string;

  @Field(() => BodyOfKnowledgeType, { nullable: true })
  bodyOfKnowledgeType?: BodyOfKnowledgeType;

  @Field(() => UUID, { nullable: true })
  bodyOfKnowledgeID?: string;
}
