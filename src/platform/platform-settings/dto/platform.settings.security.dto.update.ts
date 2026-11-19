import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdatePlatformSettingsSecurityInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Require holders of a Platform … role to use a second factor. Switching it on starts a fourteen-day grace.',
  })
  @IsOptional()
  @IsBoolean()
  secondFactorRequiredForPlatformRoles?: boolean;
}
