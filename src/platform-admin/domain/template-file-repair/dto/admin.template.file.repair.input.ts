import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class AdminTemplateFileRepairInput {
  @Field(() => [UUID], {
    nullable: true,
    description:
      'The templates to process. Required to apply the repair; omitted on a dry run, every template is audited.',
  })
  @IsOptional()
  templateIDs?: string[];

  @Field(() => Boolean, {
    defaultValue: true,
    description:
      'List the references without copying anything. Set to false to copy them.',
  })
  dryRun!: boolean;
}
