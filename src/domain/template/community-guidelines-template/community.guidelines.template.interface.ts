import { Field, ObjectType } from '@nestjs/graphql';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('CommunityGuidelinesTemplate')
export abstract class ICommunityGuidelinesTemplate extends ITemplateBase {
  @Field(() => ICommunityGuidelines, {
    nullable: false,
    description: 'The community guidelines.',
  })
  guidelines!: ICommunityGuidelines;
}