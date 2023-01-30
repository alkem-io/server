import { Configuration, FrontendApi, IdentityApi } from '@ory/kratos-client';
import {
  LoginFlowInitializeException,
  LoginFlowException,
  BearerTokenNotFoundException,
} from '@common/exceptions/auth';

export const getBearerToken = async (
  kratosPublicUrl: string,
  password_identifier: string,
  password: string
): Promise<string> | never => {
  const kratosConfig = new Configuration({
    basePath: kratosPublicUrl,
    baseOptions: {
      withCredentials: true, // Important for CORS
      timeout: 30000, // 30 seconds
    },
  });
  const ory = {
    identity: new IdentityApi(kratosConfig),
    frontend: new FrontendApi(kratosConfig),
  };

  let flowId: string;

  try {
    const flowData = await ory.frontend.createNativeRegistrationFlow();
    flowId = flowData.data.id;
  } catch (e) {
    const err = e as Error;
    throw new LoginFlowInitializeException(
      `Login flow initialize for ${password_identifier} failed with: ${err.message}`
    );
  }

  let sessionToken: string | undefined;
  let sessionId: string | undefined;

  try {
    const sessionData = await ory.frontend.updateRegistrationFlow({
      flow: flowId,
      updateRegistrationFlowBody: {
        method: 'password',
        traits: { password_identifier },
        password,
      },
    });
    sessionToken = sessionData.data.session_token;
    sessionId = sessionData.data.session?.id;
  } catch (e) {
    const err = e as Error;
    throw new LoginFlowException(
      `Login flow for ${password_identifier} failed with: ${err.message}`
    );
  }

  if (!sessionToken) {
    throw new BearerTokenNotFoundException(
      `Bearer token not found for session ${sessionId} of ${password_identifier}`
    );
  }

  return sessionToken;
};
