import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ProfileType } from '@common/enums/profile.type';
import { IUser } from '@domain/community/user/user.interface';
import { userSettingsData } from './user.settings.mock';

export const userData: { user: IUser } = {
  user: {
    type: ActorType.USER,
    firstName: 'admin',
    lastName: 'alkemio',
    email: 'admin@alkem.io',
    phone: '',
    serviceProfile: false,
    id: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e',
    accountID: '777f82a1-bc7d-486c-85f9-e7ac6e689f4e',
    settings: userSettingsData.userSettings,
    profile: {
      id: '08c6ec54-524a-4d7f-9f58-a4c50f0c0496',
      tagline: '',
      description: '',
      displayName: 'admin alkemio',
      type: ProfileType.USER,
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
              {
                type: AuthorizationCredential.GLOBAL_SUPPORT,
                resourceID: '',
              },
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
                resourceID: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e',
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
    nameID: 'admin-alkemio',
    rowId: 1,
    credentials: [
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'd3c76102-087b-4b40-8aa5-b5e6023784d0',
        id: '01a25f24-a86f-4dc1-9f72-28c796bef32d',
        createdDate: new Date('2025-05-14T00:00:00.000Z'),
        updatedDate: new Date('2025-05-14T00:00:00.000Z'),
      },
      {
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: '6adba2b9-a062-4269-a4da-8c924ded32d6',
        id: '07a29f0a-cc57-4cfd-b9b4-9cfd2667439b',
        createdDate: new Date('2025-05-14T00:00:00.000Z'),
        updatedDate: new Date('2025-05-14T00:00:00.000Z'),
      },
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: 'ed5b344e-72d1-4256-a385-f3b6e4aaaabf',
        id: '07bcf0f4-6583-4412-a64d-e090bb516960',
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
            {
              type: AuthorizationCredential.GLOBAL_SUPPORT,
              resourceID: '',
            },
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
          name: '3',
          criterias: [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: 'b69f82a1-bc7d-486c-85f9-e7ac6e689f4e',
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
      id: 'afcbcd42-8eae-4696-9ce5-321108016fd7',
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
  },
};
