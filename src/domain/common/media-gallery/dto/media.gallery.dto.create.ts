import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NameID } from '@domain/common/scalars/scalar.nameid';

@InputType()
@ObjectType('CreateMediaGalleryData')
export class CreateMediaGalleryInput {
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => [CreateVisualInput], {
    description: 'The visuals to be added to the media gallery.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateVisualInput)
  visuals!: CreateVisualInput[];
}
