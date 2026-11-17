import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateOrganizationSettingsSecurityInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Require holders of an organization role (owner, admin, associate) to use a second factor. Switching it on starts a fourteen-day grace.',
  })
  @IsBoolean()
  @IsOptional()
  secondFactorRequired?: boolean;
}
