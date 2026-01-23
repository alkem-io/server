// This file is a TypeScript version of agent.json, exporting the same mock data as a typed object.
// Update the import path and types as needed for your project.
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

export const agentData: { agent: IAgent } = {
  agent: {
    id: 'agent-123',
    type: AgentType.USER,
    credentials: [
      {
        id: 'cred-1',
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
        createdDate: new Date('2024-01-01T00:00:00.000Z'),
        updatedDate: new Date('2024-01-01T00:00:00.000Z'),
      },
    ],
    authorization: {
      type: AuthorizationPolicyType.AGENT,
      credentialRules: [
        {
          name: 'admin',
          criterias: [
            { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
          ],
          grantedPrivileges: [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ],
          cascade: true,
        },
      ],
      privilegeRules: [],
      id: 'auth-1',
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
  },
};
