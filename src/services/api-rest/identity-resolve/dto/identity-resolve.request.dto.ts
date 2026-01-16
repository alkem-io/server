import { IsUUID } from 'class-validator';

export class IdentityResolveRequestDto {
  @IsUUID('4')
  authenticationId!: string;
}
