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
      input.resultHandler.action === action && input.resultHandler.roomDetails
    );
  }
  return true;
};
