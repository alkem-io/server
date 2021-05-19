import { IBaseCherrytwist } from '@domain/common/base-entity';
import { IApplication } from '@domain/community/application';
import { IUserGroup } from '@domain/community/user-group';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces';

@ObjectType('Community', {
  implements: () => [IGroupable],
})
export abstract class ICommunity extends IBaseCherrytwist {
  @Field(() => String, {
    nullable: false,
    description: 'The name of the Community',
  })
  name!: string;

  groups?: IUserGroup[];

  applications?: IApplication[];

  parentCommunity?: ICommunity;

  ecoverseID!: string;

  constructor() {
    super();
    this.name = '';
  }
}
