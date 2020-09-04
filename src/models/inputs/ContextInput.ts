import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { ReferenceInput, TagInput } from '.';

@InputType()
export class ContextInput {

    @Field()
    @MaxLength(30)
    name!: string;

    @Field({ nullable: true })
    @MaxLength(255)
    description?: string;

    @Field({ nullable: true })
    @MaxLength(255)
    vision?: string;

    @Field({ nullable: true })
    @MaxLength(255)
    principles?: string;

    @Field(() => [ReferenceInput], { nullable: true })
    referenceLinks!: ReferenceInput[];

    @Field(() => [TagInput], { nullable: true })
    tags!: TagInput[];

}