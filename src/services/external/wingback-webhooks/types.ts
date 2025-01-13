import { Matches } from 'class-validator';

export class WingbackContractPayload {
  @Matches(/Cont_[\w-]{36}/, { message: 'Invalid Contract ID in payload' })
  id!: string;
}
