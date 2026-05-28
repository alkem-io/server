import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CreateCollaboraDocumentInput } from '@domain/collaboration/collabora-document/dto/collabora.document.dto.create';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { CreatePostInput } from '@domain/collaboration/post/dto/post.dto.create';
import { CreateMemoInput } from '@domain/common/memo/dto/memo.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateCalloutContributionData')
export class CreateCalloutContributionInput {
  @Field(() => CalloutContributionType, { nullable: false })
  type!: CalloutContributionType;

  @Field(() => CreatePostInput, { nullable: true })
  @ValidateNested({ each: true })
  post?: CreatePostInput;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateLinkInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  link?: CreateLinkInput;

  @Field(() => CreateMemoInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  memo?: CreateMemoInput;

  @Field(() => CreateCollaboraDocumentInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  collaboraDocument?: CreateCollaboraDocumentInput;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Contribution.',
  })
  sortOrder?: number;
}
