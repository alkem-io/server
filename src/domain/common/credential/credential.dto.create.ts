import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class CreateCredentialInput {
  @Field({
    nullable: false,
    description: 'The resource to which access is being delegated.',
  })
  resourceID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  privilege!: string;
}
