import { CreateNVPInput } from '@domain/common/nvp';
export class CreateApplicationInput {
  userID!: string;

  roleManagerID!: string;

  questions!: CreateNVPInput[];
}
