import { InputType, Field } from '@nestjs/graphql';
import { IsUniqTextId, TextIdType } from '@utils/validation/is-unique-text-id';
import { MaxLength } from 'class-validator';

@InputType()
export class ProjectInput {
  @Field({ nullable: true })
  @MaxLength(80)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(20)
  @IsUniqTextId(TextIdType.project)
  textID!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  description!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  state!: string;
}
