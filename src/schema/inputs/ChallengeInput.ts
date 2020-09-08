import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { ContextInput, TagInput, UpdateNestedTagInput, UpdateNestedContextInput, UserGroupInput, UpdateNestedUserGroupInput} from '.';

@InputType()
export class ChallengeInput {

    @Field({ nullable: true })
    @MaxLength(30)
    name?: string;

    @Field({ nullable: true })
    @MaxLength(255)
    description?: string;

    @Field({ nullable: true })
    @MaxLength(255)
    lifecyclePhase?: string;

    @Field(() => [TagInput], { nullable: true })
    tags?: TagInput[];

    @Field(() => ContextInput, { nullable: true })
    context?: ContextInput;
    
    @Field(() => [UserGroupInput], { nullable: true })
    groups?: UserGroupInput[];
}

@InputType()
export class BaseUpdateChallengeInput {

  @Field( { nullable: true } )
  @MaxLength(30)
  name?: string;

  @Field( { nullable: true } )
  @MaxLength(255)
  description?: string;

  @Field( { nullable: true } )
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field(() => [UpdateNestedTagInput], { nullable: true } )
  tags?: UpdateNestedTagInput[];

  @Field(() => UpdateNestedContextInput, { nullable: true } )
  context?: UpdateNestedContextInput;
  
  @Field(() => [UpdateNestedUserGroupInput], { nullable: true } )
  groups?: UpdateNestedUserGroupInput[];
}

@InputType()
export class UpdateRootChallengeInput extends BaseUpdateChallengeInput {

  @Field()
  id! : number;

}

@InputType()
export class UpdateNestedChallengeInput extends BaseUpdateChallengeInput {

  @Field( { nullable: true } )
  id? : number;

}