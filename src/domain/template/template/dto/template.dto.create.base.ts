import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { TemplateType } from '@common/enums/template.type';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateTemplateBaseInput extends CreateNameableInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  visualUri?: string;

  @Field(() => TemplateType, {
    nullable: false,
    description: 'The type of the Template to be created.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: TemplateType;
}
