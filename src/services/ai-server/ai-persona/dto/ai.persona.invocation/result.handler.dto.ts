import { Field, InputType } from '@nestjs/graphql';
import { InvocationResultAction } from './invocation.result.action.dto';
import { RoomDetails } from './room.details.dto';
@InputType()
export class ResultHandler {
  @Field(() => InvocationResultAction, {
    nullable: false,
    description:
      'The action that should be taken with the result of the invocation',
  })
  action!: InvocationResultAction;

  @Field(() => RoomDetails, {
    nullable: true,
    description: 'The context needed for the result handler',
  })
  roomDetails?: RoomDetails;
}
