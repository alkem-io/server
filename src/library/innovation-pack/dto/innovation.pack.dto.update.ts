import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Type } from 'class-transformer';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';

@InputType()
export class UpdateInnovationPackInput extends UpdateNameableInput {
  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'Update the provider Organization for the InnovationPack.',
  })
  @IsOptional()
  providerOrgID?: string;

  // Override the type of entry accepted to accept the nameID also
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the InnovationPack.',
  })
  ID!: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the Profile of the InnovationPack.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
