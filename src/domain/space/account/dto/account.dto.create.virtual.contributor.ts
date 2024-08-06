import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateVirtualContributorInput } from '@domain/community/virtual-contributor/dto/virtual.contributor.dto.create';

@InputType()
export class CreateVirtualContributorOnAccountInput extends CreateVirtualContributorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Account where the VirtualContributor is to be created.',
  })
  accountID!: string;
}
