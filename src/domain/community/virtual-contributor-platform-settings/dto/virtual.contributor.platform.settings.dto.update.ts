import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateVirtualContributorPlatformSettingsEntityInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Enable or disable the editing of the prompt graph for this Virtual Contributor.',
  })
  promptGraphEditingEnabled!: boolean;
}
