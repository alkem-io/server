import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateWhiteboardInput {
  @Field(() => ContentUpdatePolicy, { nullable: true })
  @IsOptional()
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
  profile?: UpdateProfileInput;

  // Don't update whiteboard's content from here.
  // Whiteboards are now updated through the whiteboard-collaboration-service
}
