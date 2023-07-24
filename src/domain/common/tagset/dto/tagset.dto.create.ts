import { TagsetType } from '@common/enums/tagset.type';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateTagsetInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TagsetType, { nullable: true })
  @IsOptional()
  type?: TagsetType;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  tagsetTemplate?: ITagsetTemplate;
}
