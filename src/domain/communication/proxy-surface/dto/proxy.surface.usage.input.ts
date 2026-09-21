import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

export const PROXY_USAGE_MAX_DAYS = 45;

@InputType()
export class ProxySurfaceUsageInput {
  @Field(() => Int, {
    nullable: false,
    description:
      'Number of UTC days to read, ending today (1..45 — the ledger retention).',
  })
  @IsInt()
  @Min(1)
  @Max(PROXY_USAGE_MAX_DAYS)
  days!: number;
}
