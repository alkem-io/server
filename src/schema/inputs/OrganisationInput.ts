import { Field, InputType } from 'type-graphql';
import { TagInput, UserInput, UpdateNestedUserInput, UpdateNestedTagInput } from '.';
import { MaxLength } from 'class-validator';

@InputType()
export class OrganisationInput {
  
    @Field({ nullable: true })
    @MaxLength(30)
    name?: string;
    
    @Field(() => [UserInput], { nullable: true } )
    members?: UserInput[];

    @Field(() => [TagInput], { nullable: true } )
    tags?: TagInput[];

}

@InputType()
export class BaseUpdateOrganisationInput {

  @Field( { nullable: true } )
  @MaxLength(30)
  name?: string;
  
  @Field(() => [UpdateNestedUserInput], { nullable: true } )
  members?: UpdateNestedUserInput[];

  @Field(() => [UpdateNestedTagInput], { nullable: true } )
  tags!: UpdateNestedTagInput[];

}

@InputType()
export class UpdateRootOrganisationInput extends BaseUpdateOrganisationInput {

  @Field()
  id! : number;

}

@InputType()
export class UpdateNestedOrganisationInput extends BaseUpdateOrganisationInput {

  @Field( { nullable: true } )
  id? : number;

}