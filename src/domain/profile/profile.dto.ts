import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
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
  @IsOptional()
  tagsetsData?: TagsetInput[];

  @Field(() => [ReferenceInput], { nullable: true })
  @IsOptional()
  referencesData?: ReferenceInput[];
}
