import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { ReferenceInput, TagInput } from '.';

@InputType()
export class ContextInput {

    @Field()
    @MaxLength(50)
    name!: string;

    @Field({ nullable: true })
    @MaxLength(4096)
    background?: string;

    @Field({ nullable: true })
    @MaxLength(1024)
    vision?: string;

    @Field({ nullable: true })
    @MaxLength(255)
    tagline?: string;

    @Field({ nullable: true })
    @MaxLength(1024)
    who?: string;

    @Field({ nullable: true })
    @MaxLength(1024)
    impact?: string;

    @Field(() => [ReferenceInput], { nullable: true })
    referenceLinks!: ReferenceInput[];

    @Field(() => [TagInput], { nullable: true })
    tags!: TagInput[];

}