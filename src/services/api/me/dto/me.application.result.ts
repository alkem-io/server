import { Field, ObjectType } from '@nestjs/graphql';
import { IApplication } from '@domain/community/application';
import { CommunityPendingMembershipResult } from './me.pending.membership.result';

@ObjectType()
export class CommunityApplicationResult extends CommunityPendingMembershipResult {
  @Field(() => IApplication, {
    description: 'The application itself',
  })
  application!: IApplication;
}
