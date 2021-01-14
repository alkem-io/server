import { ReferenceInput } from '@domain/reference/reference.dto';
import { TagsetInput } from '@domain/tagset/tagset.dto';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ProfileInput {
  @Field({ nullable: true })
  avatar!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  description!: string;

  @Field(() => [TagsetInput], { nullable: true })
  tagsetsData?: TagsetInput[];

  @Field(() => [ReferenceInput], { nullable: true })
  referencesData?: ReferenceInput[];
}
