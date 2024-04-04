import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';

@InputType()
export class CreateVirtualInput extends CreateContributorInput {
  @Field(() => String, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;
}
