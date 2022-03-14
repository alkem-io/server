import { CreateNVPInput } from '@domain/common/nvp';
export class CreateApplicationInput {
  userID!: string;

  parentID!: string;

  questions!: CreateNVPInput[];
}
