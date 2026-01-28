import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class InvitationEventInput {
  @Field(() => UUID, { nullable: false })
  invitationID!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  eventName!: string;
}
