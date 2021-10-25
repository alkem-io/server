import { ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IDiscussion } from '../discussion/discussion.interface';

@ObjectType('Communication')
export abstract class ICommunication extends IAuthorizable {
  discussions?: IDiscussion[];

  ecoverseID!: string;

  displayName!: string;

  // Communications related information
  updatesRoomID!: string;
  communicationGroupID!: string;

  constructor() {
    super();
  }
}
