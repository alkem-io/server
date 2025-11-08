import { Expose } from 'class-transformer';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class IdentityResolutionResponseDto {
  @Expose()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @Expose()
  @IsBoolean()
  created!: boolean;

  @Expose()
  @IsString()
  auditId!: string;
}
