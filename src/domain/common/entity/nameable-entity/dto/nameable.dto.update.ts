import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { NameID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateNameableInput extends UpdateBaseAlkemioInput {
  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
