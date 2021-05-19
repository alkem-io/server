import { IUserGroup, UserGroup } from '@domain/community/user-group';
import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType('Groupable')
export abstract class IGroupable {
  @Field(() => [IUserGroup], {
    nullable: true,
    description: 'The groups contained by this entity.',
  })
  groups?: UserGroup[];
}
