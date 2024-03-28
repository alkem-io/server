import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { ISpaceSettings } from '@domain/challenge/space.settings/space.settings.interface';

export const subspaceSettingsDefaults: ISpaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PUBLIC,
  },
  membership: {
    policy: CommunityMembershipPolicy.OPEN,
    trustedOrganizations: [], // only allow to be host org for now, not on subspaces
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
  },
};
