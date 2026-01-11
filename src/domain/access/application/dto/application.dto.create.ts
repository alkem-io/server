import { CreateNVPInput } from '@domain/common/nvp';
export class CreateApplicationInput {
  userId!: string; // Applications are user-only

  roleSetID!: string;

  questions!: CreateNVPInput[];
}
