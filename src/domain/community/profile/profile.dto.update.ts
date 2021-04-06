import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH, LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateReferenceInput } from '@domain/common/reference/reference.dto.update';
import { UpdateTagsetInput } from '@domain/common/tagset';

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
  tagsetsData?: UpdateTagsetInput[];

  @Field(() => [UpdateReferenceInput], { nullable: true })
  @IsOptional()
  referencesData?: UpdateReferenceInput[];
}
