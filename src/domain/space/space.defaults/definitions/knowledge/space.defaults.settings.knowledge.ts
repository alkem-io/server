import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

export const spaceDefaultsSettingsKnowledge: ISpaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PRIVATE,
    allowPlatformSupportAsAdmin: false,
  },
  membership: {
    policy: CommunityMembershipPolicy.APPLICATIONS,
    trustedOrganizations: [], // only allow to be host org for now, not on subspaces
    allowSubspaceAdminsToInviteMembers: false,
  },
  collaboration: {
    inheritMembershipRights: false,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
    allowEventsFromSubspaces: true,
  },
};
