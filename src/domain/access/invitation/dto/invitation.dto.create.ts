import { RoleName } from '@common/enums/role.name';

export class CreateInvitationInput {
  invitedContributorID!: string;

  welcomeMessage?: string;

  createdBy!: string;

  roleSetID!: string;

  invitedToParent!: boolean;

  extraRoles?: RoleName[];
}
