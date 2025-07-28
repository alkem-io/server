import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
@ObjectType('CreateMemoData')
export class CreateMemoInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  nameID?: string;

  @Field(() => Markdown, { nullable: true })
  @IsOptional()
  content?: string;
}
