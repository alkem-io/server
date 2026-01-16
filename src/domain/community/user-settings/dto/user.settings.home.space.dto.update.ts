import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateUserSettingsHomeSpaceInput {
  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the Space to use as home. Set to null to clear.',
  })
  @IsOptional()
  spaceID?: string | null;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Automatically redirect to home space instead of the dashboard.',
  })
  @IsOptional()
  @IsBoolean()
  autoRedirect?: boolean;
}
