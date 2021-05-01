import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class AuthorizationRemoveCapabilityInput {
  @Field({
    nullable: false,
    description: 'The resource to which access is being removed.',
  })
  resourceID!: number;

  @Field({
    nullable: false,
    description: 'The user from whom the capability is being removed.',
  })
  userID!: number;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  privilege!: string;
}
