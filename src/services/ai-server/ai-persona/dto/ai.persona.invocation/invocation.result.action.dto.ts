import { registerEnumType } from '@nestjs/graphql';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
  NONE = 'none',
}

registerEnumType(InvocationResultAction, {
  name: 'InvocationResultAction',
  description: 'Available actions for handling AI engines invocation results.',
});
