import { UUID } from '@domain/common/scalars';
import { CreatePostInput } from '@domain/collaboration/post/dto/post.dto.create';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';

@InputType()
export class CreatePostOnCalloutInput extends CreatePostInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;
}
