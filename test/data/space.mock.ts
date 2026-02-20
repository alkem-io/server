// This file is a TypeScript version of space.json, exporting the same mock data as a typed object.
// Update the import path and types as needed for your project.

import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { ProfileType } from '@common/enums/profile.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { TagsetType } from '@common/enums/tagset.type';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';

const now = new Date('2024-01-01T00:00:00.000Z');

const mockTagset: ITagset = {
  tags: [
    'collaborate',
    'connect',
    'context',
    'coordinate',
    'community',
    'challenge',
  ],
  name: 'default',
  id: '093da171-5454-452f-b024-937ccb057920',
  type: TagsetType.FREEFORM,
  createdDate: now,
  updatedDate: now,
  authorization: {
    id: '515a3ada-1b37-4c23-8da4-c431cce5880b',
    type: AuthorizationPolicyType.TAGSET,
    createdDate: now,
    updatedDate: now,
    credentialRules: [],
    privilegeRules: [],
  },
} as ITagset;

const mockProfile: IProfile = {
  id: '08c6ec54-524a-4d7f-9f58-a4c50f0c0496',
  tagline: '',
  description: '',
  displayName: 'UN Sustainable Development Goals',
  type: ProfileType.SPACE_ABOUT,
  authorization: {
    id: '2b82dab3-4581-4ff2-88e3-4997afe4f85b',
    type: AuthorizationPolicyType.PROFILE,
    createdDate: now,
    updatedDate: now,
    credentialRules: [],
    privilegeRules: [],
  },
  createdDate: now,
  updatedDate: now,
  tagsets: [mockTagset],
} as IProfile;

const mockAbout: ISpaceAbout = {
  profile: mockProfile,
} as ISpaceAbout;

const mockRoleSet: IRoleSet = {
  id: 'role-set-space-00655835-4d15-4546-801e-1ab80ac3078a',
  entryRoleName: RoleName.MEMBER,
  type: RoleSetType.SPACE,
  createdDate: now,
  updatedDate: now,
  roles: [],
} as IRoleSet;

const mockCommunity: ICommunity = {
  parentID: '00655835-4d15-4546-801e-1ab80ac3078a',
  policy:
    '{"member":{"credential":{"type":"space-member","resourceID":"00655835-4d15-4546-801e-1ab80ac3078a"},"minOrg":0,"maxOrg":-1,"minUser":0,"maxUser":-1},"lead":{"credential":{"type":"space-host","resourceID":"00655835-4d15-4546-801e-1ab80ac3078a"},"minOrg":0,"maxOrg":1,"minUser":0,"maxUser":2}}',
  id: 'd9269921-1660-4f76-95d1-16c5b3d06fb1',
  authorization: {
    id: '4b4b27c3-6a46-4bb1-b437-fc569aa0ff3e',
    type: AuthorizationPolicyType.COMMUNITY,
    createdDate: now,
    updatedDate: now,
    credentialRules: [],
    privilegeRules: [],
  },
  roleSet: mockRoleSet,
  createdDate: now,
  updatedDate: now,
} as ICommunity;

const mockAuthorization: IAuthorizationPolicy = {
  id: '26b45df9-85fe-4dff-942a-726b17455911',
  type: AuthorizationPolicyType.COMMUNITY,
  createdDate: now,
  updatedDate: now,
  credentialRules: [],
  privilegeRules: [],
};

export const spaceData: { space: ISpace } = {
  space: {
    type: ActorType.SPACE,
    id: '00655835-4d15-4546-801e-1ab80ac3078a',
    nameID: 'un-sdgs',
    rowId: 1,
    about: mockAbout,
    platformRolesAccess: {
      roles: [],
    },
    community: mockCommunity,
    authorization: mockAuthorization,
    // Tagset is not a direct ISpace property, but included here for completeness if needed in tests
    // tagset: mockTagset,
    level: SpaceLevel.L0,
    visibility: SpaceVisibility.ACTIVE,
    levelZeroSpaceID: '00655835-4d15-4546-801e-1ab80ac3078a',
    sortOrder: 0,
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    // Add a minimal settings mock for ISpace
    settings: {
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
      membership: {
        policy: CommunityMembershipPolicy.APPLICATIONS,
        trustedOrganizations: [],
        allowSubspaceAdminsToInviteMembers: true,
      },
      collaboration: {
        inheritMembershipRights: false,
        allowMembersToCreateSubspaces: false,
        allowMembersToCreateCallouts: false,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
        allowGuestContributions: false,
      },
    },
  },
};
