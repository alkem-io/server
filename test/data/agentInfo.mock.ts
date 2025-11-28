// This file is a TypeScript version of agentInfo.json, exporting the same mock data as a typed object.
// It uses the AgentInfo class for type safety and correct enum usage.
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

export const agentInfoData: { agentInfo: AgentInfo } = {
  agentInfo: {
    isAnonymous: false,
    userID: '91b7e044-61ff-468b-a705-1672b0bda510',
    email: 'admin@alkem.io',
    emailVerified: true,
    firstName: 'Valentin Admin',
    lastName: 'Yanakiev',
    credentials: [
      {
        resourceID: '',
        type: AuthorizationCredential.GLOBAL_ADMIN,
      },
    ],
    communicationID: '@admin=alkem.io:matrix.alkem.io',
    agentID: '66000b15-ae7f-448e-aade-3b4ae1fd4c33',
    avatarURL: '',
    // expiry is optional and not set in the original mock
  },
};
