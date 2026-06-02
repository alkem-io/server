import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LibraryInnovationPacksFilterInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Return Innovation Packs whose title, description or tags contain this term (case-insensitive).',
  })
  searchTerm?: string;
}
