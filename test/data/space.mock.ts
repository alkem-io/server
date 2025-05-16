// This file is a TypeScript version of space.json, exporting the same mock data as a typed object.
// Update the import path and types as needed for your project.
import { ISpace } from '@domain/space/space/space.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';

export const spaceData: { space: ISpace } = {
  space: {
    id: 'space-123',
    name: 'Test Space',
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
    },
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
  },
};
