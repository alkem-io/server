import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { VisualType } from '@common/enums/visual.type';
import { CreateLinkInput } from '@domain/collaboration/link/dto/link.dto.create';
import { CreateMemoInput } from '@domain/common/memo/types';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/types';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

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

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];

  // Don't expose in the GraphQL schema
  // Used to create associated MediaGallery and Visuals from templates, but it's not sendable from the clients
  // Clients add and remove visuals through separate mutations after creation
  /* //!! mediaGallery?: {
    visuals?: {
      name: VisualType;
      uri: string;
    }[];
  };
  */
}
