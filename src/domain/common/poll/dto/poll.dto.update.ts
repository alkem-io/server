import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdatePollInput {
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

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  content?: any;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isAnonymous?: boolean;
}
