import { RoleName } from '@common/enums/role.name';
export class CreatePlatformInvitationInput {
  email!: string;

  welcomeMessage?: string;

  createdBy!: string;

  roleSetID?: string;
  roleSetInvitedToParent!: boolean;
  roleSetExtraRole?: RoleName;
}
