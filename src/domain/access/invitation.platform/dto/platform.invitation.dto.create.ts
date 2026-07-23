import { RoleName } from '@common/enums/role.name';
export class CreatePlatformInvitationInput {
  email!: string;

  welcomeMessage?: string;

  createdBy!: string;

  roleSetID?: string;
  roleSetInvitedToParent!: boolean;
  roleSetExtraRoles!: RoleName[];

  /** Optional language the inviter expects the invitee to prefer (FR-014b). */
  suggestedLanguage?: string;
}
