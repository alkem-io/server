import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create';

@InputType()
@ObjectType('CreateKnowledgeBaseData')
export class CreateKnowledgeBaseInput {
  @Field(() => CreateProfileInput, { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => CreateCalloutsSetInput, {
    nullable: true,
    description: 'The CalloutsSet to use for this KnowledgeBase.',
  })
  @ValidateNested()
  @Type(() => CreateCalloutsSetInput)
  calloutsSetData?: CreateCalloutsSetInput;
}
