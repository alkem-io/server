import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VirtualContributorSettingsPrivacy')
export abstract class IVirtualContributorSettingsPrivacy {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Are the contents of the knowledge base publicly visible.',
  })
  knowledgeBaseContentVisible!: boolean;
}
