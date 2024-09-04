import { Field, InputType } from '@nestjs/graphql';
import { TemplateType } from '@common/enums/template.type';

@InputType()
export class LibraryTemplatesFilterInput {
  @Field(() => [TemplateType], {
    nullable: true,
    description:
      'Return Templates within the Library matching the specified Template Types.',
  })
  types!: TemplateType[];
}
