import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateUserSettingsHomeSpaceInput {
  @Field(() => String, {
    nullable: true,
    description: 'The ID of the Space to use as home.',
  })
  @IsOptional()
  @IsUUID()
  spaceID?: string | null;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Automatically redirect to home space instead of the dashboard.',
  })
  @IsBoolean()
  autoRedirect!: boolean;
}
