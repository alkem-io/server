import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH, LONG_TEXT_LENGTH } from '@src/common/constants';
import {
  UpdateReferenceInput,
  CreateReferenceInput,
} from '@domain/common/reference';
import { UpdateTagsetInput, CreateTagsetInput } from '@domain/common/tagset';

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: false })
  ID!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => [UpdateTagsetInput], { nullable: true })
  @IsOptional()
  updateTagsetsData?: UpdateTagsetInput[];

  @Field(() => [CreateTagsetInput], { nullable: true })
  @IsOptional()
  createTagsetsData?: CreateTagsetInput[];

  @Field(() => [UpdateReferenceInput], { nullable: true })
  @IsOptional()
  updateReferencesData?: UpdateReferenceInput[];

  @Field(() => [CreateReferenceInput], { nullable: true })
  @IsOptional()
  createReferencesData?: CreateReferenceInput[];
}
