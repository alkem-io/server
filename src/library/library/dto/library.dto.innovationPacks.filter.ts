import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class LibraryInnovationPacksFilterInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Return Innovation Packs whose title, description or tags contain this term (case-insensitive).',
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;
}
