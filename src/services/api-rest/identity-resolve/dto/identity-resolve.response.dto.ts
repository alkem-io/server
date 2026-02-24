import { IsUUID } from 'class-validator';

export class IdentityResolveResponseDto {
  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  actorID!: string;
}
