import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Body shape posted by the Kratos settings flow's `after.password.hooks`
 * web-hook (configured via jsonnet template in `.build/ory/kratos/`). The
 * server only needs the identity id; everything else is observation context.
 */
export class PasswordChangedWebhookPayload {
  @IsUUID()
  identityId!: string;

  @IsOptional()
  @IsISO8601()
  observedAt?: string;

  @IsOptional()
  @IsString()
  flowId?: string;
}
