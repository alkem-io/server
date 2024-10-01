import { CreateNVPInput } from '@domain/common/nvp';
export class CreateApplicationInput {
  userID!: string;

  roleSetID!: string;

  questions!: CreateNVPInput[];
}
