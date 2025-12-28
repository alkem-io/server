import { RoleName } from '@common/enums/role.name';

export class CreateInvitationInput {
  invitedActorId!: string;

  welcomeMessage?: string;

  createdBy!: string;

  roleSetID!: string;

  invitedToParent!: boolean;

  extraRoles?: RoleName[];
}
