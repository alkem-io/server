import { IApplication } from '@domain/community/application/application.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { ICommunication } from '@domain/communication/communication';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'The name of the Community',
  })
  displayName!: string;

  groups?: IUserGroup[];

  applications?: IApplication[];

  parentCommunity?: ICommunity;

  // The credential profile that is used for determining membership of this community
  credential?: ICredential;

  ecoverseID!: string;

  communication?: ICommunication;

  constructor() {
    super();
    this.displayName = '';
  }
}
