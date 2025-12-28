import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class RoomVcOptions {
  @Field(() => String, {
    nullable: true,
    description: 'Preferred language for VC responses',
  })
  language?: string;
}

@InputType()
export class RoomSendMessageInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room the message is being sent to',
  })
  roomID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  message!: string;

  @Field(() => RoomVcOptions, {
    nullable: true,
    description: 'Options for Virtual Contributor interactions in this room',
  })
  vcOptions?: RoomVcOptions;
}
