import { TemplateType } from '@common/enums/template.type';
import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';

@InputType()
export class LibraryTemplatesFilterInput {
  @Field(() => [TemplateType], {
    nullable: true,
    description:
      'Return Templates within the Library matching the specified Template Types.',
  })
  @IsOptional()
  @IsEnum(TemplateType, { each: true })
  types?: TemplateType[];

  @Field(() => String, {
    nullable: true,
    description:
      'Return Templates whose title, description or tags contain this term (case-insensitive).',
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;
}
