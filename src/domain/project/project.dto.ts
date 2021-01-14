import { Field, InputType } from '@nestjs/graphql';
import {
  IsUniqueTextId,
  TextIdType,
} from '@utils/validation/constraints/is.unique.text.id';
import { MaxLength } from 'class-validator';

@InputType()
export class ProjectInput {
  @Field({ nullable: true })
  @MaxLength(80)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(20)
  @IsUniqueTextId(TextIdType.project)
  textID!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  description!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  state!: string;
}
