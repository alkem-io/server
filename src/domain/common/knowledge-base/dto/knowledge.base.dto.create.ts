import { CreateCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateKnowledgeBaseData')
export class CreateKnowledgeBaseInput {
  @Field(() => CreateProfileInput, {
    nullable: false,
    description: 'The Profile to use for this KnowledgeBase.', // Code ensures it is set to default values if not provided
  })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => CreateCalloutsSetInput, {
    nullable: true, // Code ensures it is set to default values if not provided
    description: 'The CalloutsSet to use for this KnowledgeBase.',
  })
  @ValidateNested()
  @Type(() => CreateCalloutsSetInput)
  calloutsSetData!: CreateCalloutsSetInput;
}
