import { ALT_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class VisualUploadImageInput {
  @Field({ nullable: false })
  visualID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(ALT_TEXT_LENGTH)
  alternativeText?: string;
}
