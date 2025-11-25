import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
  NONE = 'none',
}

@InputType()
export class RoomDetails {
  @Field(() => String, {
    nullable: false,
    description: 'The room to which the reply shold be posted.',
  })
  roomID!: string;
  @Field(() => String, {
    nullable: false,
    description: 'The thread to which the reply shold be posted.',
  })
  threadID!: string;
  @Field(() => String, {
    nullable: false,
    description: 'The agentID for the VC',
  })
  agentID!: string;
  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question',
  })
  vcInteractionID?: string | undefined = undefined;
}

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
  roomDetails?: RoomDetails = undefined;
}

@InputType()
export class VirtualContributorInvocationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Contributor to be asked.',
  })
  virtualContributorID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message for the virtual contributor invocation.',
  })
  message!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The context space for the Virtual Contributor invocation',
  })
  contextSpaceID: string | undefined = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine',
  })
  userID: string | undefined = undefined;

  @Field(() => ResultHandler, {
    nullable: false,
    description: 'What should happen with the result of the VC invocation',
  })
  resultHandler!: ResultHandler;
}
