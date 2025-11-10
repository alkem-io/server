import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateMemoInput {
  @Field(() => ContentUpdatePolicy, { nullable: true })
  @IsOptional()
  contentUpdatePolicy?: ContentUpdatePolicy;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  // Don't update memo's content from here.
  // Memos are now updated through the colllaborative-document-service
}
