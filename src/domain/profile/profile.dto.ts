import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ReferenceInput } from '@domain/reference/reference.dto';
import { TagsetInput } from '@domain/tagset/tagset.dto';

@InputType()
export class ProfileInput {
  @Field({ nullable: true })
  @MaxLength(250)
  avatar!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  description!: string;

  @Field(() => [TagsetInput], { nullable: true })
  tagsetsData?: TagsetInput[];

  @Field(() => [ReferenceInput], { nullable: true })
  referencesData?: ReferenceInput[];
}
