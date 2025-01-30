import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateVirtualContributorSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Enable the content of knowledge bases to be accessed or not.',
  })
  @IsBoolean()
  knowledgeBaseContentVisible!: boolean;
}
