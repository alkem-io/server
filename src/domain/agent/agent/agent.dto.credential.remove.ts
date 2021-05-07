import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class RemoveCredentialInput {
  @Field({
    nullable: false,
    description: 'The Agent from whom the credential is being removed.',
  })
  agentID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: number;
}
