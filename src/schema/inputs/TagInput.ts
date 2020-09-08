import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class TagInput {
  
    @Field({ nullable: true })
    @MaxLength(30)
    name?: string;

}

@InputType()
export class UpdateNestedTagInput extends TagInput{

    @Field()
    id! : number;
  
}

@InputType()
export class UpdateRootTagInput extends TagInput{

    @Field( { nullable: true } )
    id? : number;
  
}