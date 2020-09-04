import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { ContextInput, TagInput } from '.';

@InputType()
export class ChallengeInput {

    @Field()
    @MaxLength(30)
    name!: string;

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

}