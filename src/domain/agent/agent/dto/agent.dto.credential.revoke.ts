import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class RevokeCredentialInput {
  @Field({
    nullable: false,
    description: 'The Agent from whom the credential is being removed.',
  })
  agentID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: string;
}
