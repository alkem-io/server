import { RoleName } from '@common/enums/role.name';

export class CreateInvitationInput {
  invitedActorID!: string;

  welcomeMessage?: string;

  createdBy!: string;

  roleSetID!: string;

  invitedToParent!: boolean;

  extraRoles?: RoleName[];

  /** Optional language the inviter expects the invitee to prefer (FR-014b). */
  suggestedLanguage?: string;
}
