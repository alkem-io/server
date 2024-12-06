import {
  InvocationResultAction,
  VirtualContributorInvocationInput,
} from './virtual.contributor.dto.invocation.input';

export const isInputValidForAction = (
  input: VirtualContributorInvocationInput,
  action: InvocationResultAction
) => {
  if (action === InvocationResultAction.POST_REPLY) {
    return (
      input.resultHandler.action === action && input.resultHandler.roomDetails
    );
  }
  return true;
};
