import { IsDefined, IsUUID } from 'class-validator';

export class IdentityResolutionRequestDto {
  @IsDefined({ message: 'kratosIdentityId is required' })
  @IsUUID('4', { message: 'kratosIdentityId must be a valid UUID' })
  kratosIdentityId!: string;
}
