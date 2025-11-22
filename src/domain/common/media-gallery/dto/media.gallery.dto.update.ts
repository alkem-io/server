import { InputType, Field } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateVisualInput } from '@domain/common/visual';

@InputType()
export class UpdateMediaGalleryInput {
  @Field(() => [UpdateVisualInput], {
    description:
      'The new list of visuals for the media gallery. Replaces existing ones.',
  })
  @ValidateNested({ each: true })
  @Type(() => UpdateVisualInput)
  visuals!: UpdateVisualInput[];
}
