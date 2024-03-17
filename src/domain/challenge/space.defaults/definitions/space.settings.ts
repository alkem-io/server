import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { ISpaceSettings } from '@domain/challenge/space.settings/space.settings.interface';

export const spaceSettingsDefaults: ISpaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PUBLIC, //'public', // private / hidden
  },
  membership: {
    policy: CommunityMembershipPolicy.APPLICATIONS, // invitations / applications / open. Note: subspaces require parent space membership
    trustedOrganizations: [], // only allow to be host org for now, not on subspaces
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
  },
};
