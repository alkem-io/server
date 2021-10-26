import { MID_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CommunicationSendUpdateMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The communication the message is being sent to',
  })
  communicationID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  message!: string;
}
