import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CreateVisualInput } from '@domain/common/visual/dto/visual.dto.create';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
@ObjectType('CreateMediaGalleryData')
export class CreateMediaGalleryInput {
  @Field(() => [CreateVisualInput], {
    description: 'The visuals to be added to the media gallery.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateVisualInput)
  visuals!: CreateVisualInput[];
}
