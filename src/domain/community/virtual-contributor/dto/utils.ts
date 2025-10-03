import { AiPersonaInvocationInput } from '@services/ai-server/ai-persona';
import {
  InvocationResultAction,
  VirtualContributorInvocationInput,
} from './virtual.contributor.dto.invocation.input';

export const isInputValidForAction = (
  input: AiPersonaInvocationInput | VirtualContributorInvocationInput,
  action: InvocationResultAction
) => {
  if (action === InvocationResultAction.POST_REPLY) {
    return (
      input.resultHandler.action === action && input.resultHandler.roomDetails
    );
  }
  return true;
};
