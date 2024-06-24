import { Field, InputType } from '@nestjs/graphql';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { IsOptional } from 'class-validator';

@InputType()
export class UpdateLicenseInput {
  @Field(() => SpaceVisibility, {
    nullable: true,
    description: 'Visibility of the Space.',
  })
  @IsOptional()
  visibility?: SpaceVisibility;
}
