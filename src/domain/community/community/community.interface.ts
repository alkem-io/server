import { IApplication } from '@domain/community/application';
import { IUserGroup } from '@domain/community/user-group';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces';
import { IAuthorizable } from '@domain/common/authorizable-entity';
import { ICredential } from '@domain/agent/credential';

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

  constructor() {
    super();
    this.displayName = '';
  }
}
