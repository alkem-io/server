import { IApplication } from '@domain/community/application/application.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ICommunication } from '@domain/communication/communication';
import { CommunityType } from '@common/enums/community.type';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { IForm } from '@domain/common/form/form.interface';

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

  applicationForm?: IForm;

  parentCommunity?: ICommunity;

  policy!: ICommunityPolicy;

  hubID!: string;

  communication?: ICommunication;
  type!: CommunityType;

  parentID!: string;

  constructor() {
    super();
    this.displayName = '';
  }
}
