// This file is a TypeScript version of organization.json, exporting the same mock data as a typed object.
// It uses the IOrganization interface for type safety.
import { IOrganization } from '@domain/community/organization/organization.interface';
import { ProfileType } from '@common/enums/profile.type';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';

export const organizationData: { organization: IOrganization } = {
  organization: {
    type: ActorType.ORGANIZATION,
    legalEntityName: '',
    domain: '',
    website: '',
    contactEmail: '',
    id: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
    nameID: 'united-nations',
    profile: {
      id: '08c6ec54-524a-4d7f-9f58-a4c50f0c0496',
      tagline: '',
      description: '',
      displayName: 'host org',
      type: ProfileType.ORGANIZATION,
      authorization: {
        type: AuthorizationPolicyType.PROFILE,
        credentialRules: [
          {
            name: '1',
            criterias: [
              { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
            ],
            grantedPrivileges: [
              AuthorizationPrivilege.CREATE,
              AuthorizationPrivilege.GRANT,
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.UPDATE,
              AuthorizationPrivilege.DELETE,
            ],
            cascade: true,
          },
          {
            name: '2',
            criterias: [
              { type: AuthorizationCredential.GLOBAL_SUPPORT, resourceID: '' },
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
          {
            name: 'user-self',
            criterias: [
              {
                type: AuthorizationCredential.USER_SELF_MANAGEMENT,
                resourceID: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
              },
            ],
            grantedPrivileges: [
              AuthorizationPrivilege.CREATE,
              AuthorizationPrivilege.READ,
              AuthorizationPrivilege.UPDATE,
            ],
            cascade: true,
          },
        ],
        privilegeRules: [],
        id: '2b82dab3-4581-4ff2-88e3-4997afe4f85b',
        createdDate: new Date('2024-01-01T00:00:00.000Z'),
        updatedDate: new Date('2024-01-01T00:00:00.000Z'),
      },
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    // Organization IS an Actor - credentials are directly on the entity
    credentials: [
      {
        type: AuthorizationCredential.ACCOUNT_ADMIN,
        resourceID: '00655835-4d15-4546-801e-1ab80ac3078a',
        id: 'bc898751-6ea0-4c1f-93e8-9c01e985ce72',
        createdDate: new Date('2025-05-14T00:00:00.000Z'),
        updatedDate: new Date('2025-05-14T00:00:00.000Z'),
      },
    ],
    authorization: {
      type: AuthorizationPolicyType.PROFILE,
      credentialRules: [
        {
          name: '1',
          criterias: [
            { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
          ],
          grantedPrivileges: [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.GRANT,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          cascade: true,
        },
        {
          name: '2',
          criterias: [
            { type: AuthorizationCredential.GLOBAL_SUPPORT, resourceID: '' },
          ],
          grantedPrivileges: [
            AuthorizationPrivilege.GRANT,
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          cascade: true,
        },
        {
          name: 'org-admin',
          criterias: [
            {
              type: AuthorizationCredential.ORGANIZATION_ADMIN,
              resourceID: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
            },
          ],
          grantedPrivileges: [
            AuthorizationPrivilege.GRANT,
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          cascade: true,
        },
        {
          name: 'org-owner',
          criterias: [
            {
              type: AuthorizationCredential.ORGANIZATION_OWNER,
              resourceID: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
            },
          ],
          grantedPrivileges: [
            AuthorizationPrivilege.GRANT,
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          cascade: true,
        },
        {
          name: 'org-associate',
          criterias: [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: '03bb5b07-f134-4074-97b9-1dd7950c7fa4',
            },
          ],
          grantedPrivileges: [AuthorizationPrivilege.READ],
          cascade: true,
        },
        {
          name: 'global-registered',
          criterias: [
            { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
          ],
          grantedPrivileges: [AuthorizationPrivilege.READ],
          cascade: true,
        },
      ],
      privilegeRules: [],
      id: '8b4fe82b-6135-4b6b-81de-4fdbde945e18',
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    // Fully valid IRoleSet mock (minimal)
    roleSet: {
      id: 'role-set-1',
      roles: [],
      entryRoleName: RoleName.ASSOCIATE,
      type: RoleSetType.ORGANIZATION,
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    accountID: 'account-03bb5b07-f134-4074-97b9-1dd7950c7fa4',
    rowId: 1,
    settings: {
      privacy: { contributionRolesPubliclyVisible: true },
      membership: { allowUsersMatchingDomainToJoin: false },
    },
  },
};
