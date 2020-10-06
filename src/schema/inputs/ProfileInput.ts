import { Field, InputType } from 'type-graphql';
import { ReferenceInput, UpdateReferenceInput, TagsetInput, UpdateRootTagsetInput } from '.';

@InputType()
export class ProfileInput {
  @Field(() => [ReferenceInput], { nullable: true })
  references?: ReferenceInput[];

  @Field(() => [TagsetInput], { nullable: true })
  tagsets?: TagsetInput[];
}

@InputType()
export class BaseUpdateProfileInput {
  @Field(() => [UpdateReferenceInput], { nullable: true })
  references?: UpdateReferenceInput[];

  @Field(() => [UpdateRootTagsetInput], { nullable: true })
  tagsets?: TagsetInput[];
}

@InputType()
export class UpdateRootProfileInput extends BaseUpdateProfileInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateNestedProfileInput extends BaseUpdateProfileInput {
  @Field({ nullable: true })
  id?: number;
}
