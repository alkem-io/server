import { InputType, Field } from '@nestjs/graphql';
import { IsDataURI, MaxLength } from 'class-validator';

@InputType()
export class ReferenceInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name!: string;

  @Field({ nullable: true })
  @IsDataURI()
  uri!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  description?: string;
}
