import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { CreateMemoInput } from '@domain/common/memo/types';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CreateMediaGalleryInput } from '@domain/common/media-gallery/dto/media.gallery.dto.create';

@InputType()
@ObjectType('CreateCalloutFramingData')
export class CreateCalloutFramingInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => CalloutFramingType, {
    nullable: true,
    description:
      'The type of additional content attached to the framing of the callout. Defaults to None.',
  })
  @IsOptional()
  type?: CalloutFramingType;

  @Field(() => CreateWhiteboardInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWhiteboardInput)
  whiteboard?: CreateWhiteboardInput;

  @Field(() => CreateLinkInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLinkInput)
  link?: CreateLinkInput;

  @Field(() => CreateMemoInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMemoInput)
  memo?: CreateMemoInput;

  @Field(() => CreateMediaGalleryInput, { nullable: true })
  @IsOptional()
  // @ValidateNested()
  @Type(() => CreateMediaGalleryInput)
  mediaGallery?: CreateMediaGalleryInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
