import { Configuration, PublicApi } from '@ory/kratos-client';

export const getBearerToken = async (
  kratosPublicUrl: string,
  password_identifier: string,
  password: string
): Promise<string> | never => {
  const kratos = new PublicApi(
    new Configuration({
      basePath: kratosPublicUrl,
    })
  );

  const {
    data: { id: flowId },
  } = await kratos.initializeSelfServiceLoginForNativeApps();

  const {
    data: { session_token: sessionToken },
  } = await kratos.submitSelfServiceLoginFlow(flowId, {
    method: 'password',
    password_identifier,
    password,
  });

  return sessionToken;
};
