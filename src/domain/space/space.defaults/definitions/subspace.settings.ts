import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

export const subspaceSettingsDefaults: ISpaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PUBLIC,
    allowPlatformSupportAsAdmin: false,
  },
  membership: {
    policy: CommunityMembershipPolicy.OPEN,
    trustedOrganizations: [], // only allow to be host org for now, not on subspaces
    allowSubspaceAdminsToInviteMembers: false,
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
  },
};
