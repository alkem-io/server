import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';
import { VirtualContributorType } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.type';

@InputType()
export class CreateVirtualInput extends CreateContributorInput {
  @Field(() => String, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => VirtualContributorType, {
    description: 'VC  type.',
  })
  type!: VirtualContributorType;
}
