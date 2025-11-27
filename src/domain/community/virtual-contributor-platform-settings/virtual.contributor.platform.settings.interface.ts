import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VirtualContributorPlatformSettings')
export abstract class IVirtualContributorPlatformSettings {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Enable or disable the editing of the prompt graph for this Virtual Contributor.',
  })
  promptGraphEditingEnabled!: boolean;
}
