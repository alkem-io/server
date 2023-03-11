import { InputType, Field } from '@nestjs/graphql';
import { NameID } from '@domain/common/scalars';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
