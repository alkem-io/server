import {
  AiPersonaServiceInvocationInput,
  InvocationResultAction,
} from './ai.persona.service.invocation.dto.input';

export const isInputValidForAction = (
  input: AiPersonaServiceInvocationInput,
  action: InvocationResultAction
) => {
  if (action === InvocationResultAction.POST_REPLY) {
    return (
      input.resultHandler.action === action &&
      input.resultHandler.roomDetails &&
      input.resultHandler.roomDetails.threadID
    );
  }
  if (action === InvocationResultAction.POST_MESSAGE) {
    return (
      input.resultHandler.action === action && input.resultHandler.roomDetails
    );
  }

  // better safe than sorry
  return false;
};
