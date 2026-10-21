import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class AdminTemplateFileRepairInput {
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The templates to process. When omitted, every template is processed.',
  })
  @IsOptional()
  templateIDs?: string[];

  @Field(() => Boolean, {
    defaultValue: true,
    description:
      "List the references without copying anything. Set to false to copy the files the template's owner can read.",
  })
  dryRun!: boolean;
}
