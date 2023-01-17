import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IDiscussion } from '../discussion/discussion.interface';
import { IUpdates } from '../updates/updates.interface';
import { DiscussionCategory } from '@common/enums/communication.discussion.category';

@ObjectType('Communication')
export abstract class ICommunication extends IAuthorizable {
  discussions?: IDiscussion[];
  updates?: IUpdates;

  hubID!: string;

  displayName!: string;

  @Field(() => [DiscussionCategory])
  discussionCategories!: string[];

  // Communications related information
  communicationGroupID!: string;

  constructor() {
    super();
  }
}
