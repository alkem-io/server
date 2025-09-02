import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Type } from 'class-transformer';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

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
