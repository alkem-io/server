import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsUUID } from 'class-validator';

@InputType()
export class AdminUserEmailChangeInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The subject user whose login email is being changed.',
  })
  @IsUUID()
  userID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The proposed new email address.',
  })
  @IsEmail()
  newEmail!: string;
}
