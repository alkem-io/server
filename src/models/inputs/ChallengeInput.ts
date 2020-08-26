import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagInput, ContextInput } from '.';
import { Challenge } from '../entities';
import { GraphQLID } from 'graphql';

@InputType()
export class ChallengeInput {

  @Field()
  @MaxLength(30)
  name! : string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field( type => [TagInput], { nullable: true } )
  tags?: TagInput[];

  @Field( type => ContextInput, { nullable: true })
  context?: ContextInput;

}