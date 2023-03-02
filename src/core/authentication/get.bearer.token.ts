import { Configuration, FrontendApi } from '@ory/kratos-client';
import {
  LoginFlowInitializeException,
  LoginFlowException,
  BearerTokenNotFoundException,
} from '@common/exceptions/auth';

/***
 *
 * @param kratosPublicUrl
 * @param identifier Previously *password_identifier* - the email or username of the user trying to log in.
 * @param password The user\'s password.
 */
export const getBearerToken = async (
  kratosPublicUrl: string,
  identifier: string,
  password: string
): Promise<string> | never => {
  const kratos = new FrontendApi(
    new Configuration({
      basePath: kratosPublicUrl,
    })
  );

  let flowId: string;

  try {
    const flowData = await kratos.createNativeLoginFlow();
    flowId = flowData.data.id;
  } catch (e) {
    const err = e as Error;
    throw new LoginFlowInitializeException(
      `Login flow initialize for ${identifier} failed with: ${err.message}`
    );
  }

  let sessionToken: string | undefined;
  let sessionId: string | undefined;

  try {
    const sessionData = await kratos.updateLoginFlow({
      flow: flowId,
      updateLoginFlowBody: {
        method: 'password',
        identifier,
        password,
      },
    });
    sessionToken = sessionData.data.session_token;
    sessionId = sessionData.data.session.id;
  } catch (e) {
    const err = e as Error;
    throw new LoginFlowException(
      `Login flow for ${identifier} failed with: ${err.message}`
    );
  }

  if (!sessionToken) {
    throw new BearerTokenNotFoundException(
      `Bearer token not found for session ${sessionId} of ${identifier}`
    );
  }

  return sessionToken;
};
