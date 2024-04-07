import { Field, InputType } from '@nestjs/graphql';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class CreateVirtualContributorInput extends CreateContributorInput {
  @Field(() => UUID, { nullable: false })
  virtualPersonaID!: string;
}
