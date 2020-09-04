import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { TagInput, UserInput } from '.';

@InputType()
export class OrganisationInput {

    @Field()
    @MaxLength(30)
    name!: string;

    @Field(() => [UserInput], { nullable: true })
    members?: UserInput[];

    @Field(() => [TagInput], { nullable: true })
    tags!: TagInput[];

}