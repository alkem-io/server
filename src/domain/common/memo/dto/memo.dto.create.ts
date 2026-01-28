import { CreateProfileInput } from '@domain/common/profile/dto';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateMemoData')
export class CreateMemoInput {
  nameID?: string;

  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  @Field(() => Markdown, { nullable: true })
  markdown?: string;
}
