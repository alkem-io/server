import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '@domain/common/profile/dto';

// Note: does not inherit from base challenge input for updates as do not want nameID to be updateable
@InputType()
export class UpdateSpaceInput extends UpdateBaseAlkemioInput {
  // Override the type of entry accepted
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID or NameID of the Space.',
  })
  ID!: string;

  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the contained Context entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContextInput)
  context?: UpdateContextInput;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
