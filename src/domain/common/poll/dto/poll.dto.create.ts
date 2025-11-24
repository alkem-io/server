import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Type } from 'class-transformer';
import { NameID } from '@domain/common/scalars';

@InputType()
@ObjectType('CreatePollData')
export class CreatePollInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile?: CreateProfileInput;

  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  nameID?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  content?: any;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isAnonymous?: boolean;
}
