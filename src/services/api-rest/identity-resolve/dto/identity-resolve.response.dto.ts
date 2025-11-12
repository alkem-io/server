import { IsUUID } from 'class-validator';

export class IdentityResolveResponseDto {
  @IsUUID('4')
  userId!: string;
}
