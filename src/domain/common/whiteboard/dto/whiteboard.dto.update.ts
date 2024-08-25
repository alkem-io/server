import { SMALL_TEXT_LENGTH } from '@common/constants';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateWhiteboardInput {
  @Field(() => ContentUpdatePolicy, { nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  contentUpdatePolicy?: ContentUpdatePolicy;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;

  @Field(() => WhiteboardContent, {
    nullable: true,
    description: 'The new content to be used.',
  })
  @IsOptional()
  content?: string;
}
