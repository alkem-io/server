import { UUID } from '@domain/common/scalars';
import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, ValidateIf } from 'class-validator';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
}

registerEnumType(InvocationResultAction, {
  name: 'InvocationResultAction',
  description: 'Available actions for handling AI engines invocation results.',
});

@InputType()
export class RoomDetails {
  @Field(() => String, {
    nullable: false,
    description: 'The room to which the reply shold be posted.',
  })
  roomID!: string;
  @Field(() => String, {
    nullable: true,
    description: 'The thread to which the reply shold be posted.',
  })
  threadID?: string;
  @Field(() => String, {
    nullable: false,
    description: 'The communicationID for the VC',
  })
  communicationID!: string;
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
  roomDetails?: RoomDetails;

  @ValidateIf(handler => handler.action === InvocationResultAction.POST_REPLY)
  @IsNotEmpty({
    message:
      'roomDetails with roomID, threadID and communicationID is required when action is POST_REPLY',
  })
  validateRoomDetails?() {
    return this.roomDetails && this.roomDetails.threadID;
  }
}

@InputType()
export class AiPersonaServiceInvocationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'Virtual Persona Type.',
  })
  aiPersonaServiceID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent to the engine.',
  })
  message!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the context, the Virtual Persona is asked a question.',
  })
  contextID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine.',
  })
  userID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the message thread where the Virtual Contributor is asked a question if applicable.',
  })
  threadID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question.',
  })
  interactionID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'The Virtual Contributor description.',
  })
  description?: string = undefined;

  @Field(() => String, {
    nullable: false,
    description: 'The Virtual Contributor displayName.',
  })
  displayName!: string;

  // intentially skippuing the Field decorator as we are not sure we want to expose this data
  // through the API
  externalMetadata: ExternalMetadata = {};
  @Field(() => ResultHandler, {
    nullable: false,
    description: 'What should happen with the result of the VC invocation',
  })
  resultHandler!: ResultHandler;

  language?: string;
}
