import { Length, MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { TagInput } from '.';

@InputType()
export class AgreementInput {

    @Field()
    @MaxLength(30)
    name!: string;

    @Field({ nullable: true })
    @Length(0, 255)
    description!: string;

    @Field(() => [TagInput], { nullable: true })
    tags!: TagInput[];

}