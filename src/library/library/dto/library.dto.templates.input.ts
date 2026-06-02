import { TemplateType } from '@common/enums/template.type';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LibraryTemplatesFilterInput {
  @Field(() => [TemplateType], {
    nullable: true,
    description:
      'Return Templates within the Library matching the specified Template Types.',
  })
  types?: TemplateType[];

  @Field(() => String, {
    nullable: true,
    description:
      'Return Templates whose title, description or tags contain this term (case-insensitive).',
  })
  searchTerm?: string;
}
