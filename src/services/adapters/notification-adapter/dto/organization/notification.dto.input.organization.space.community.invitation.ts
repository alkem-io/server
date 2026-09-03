import { RoleName } from '@common/enums/role.name';
import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputOrganizationSpaceCommunityInvitation
  extends NotificationInputBase {
  community: ICommunity;
  invitationID: string;
  invitedContributorID: string;
  welcomeMessage?: string;
  extraRoles: RoleName[];
  invitedToParent: boolean;
  organizationHasNoAdministrators: boolean;
}
