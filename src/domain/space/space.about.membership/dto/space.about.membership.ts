import { IRoleSet } from '@domain/access/role-set';
import { ICommunity } from '@domain/community/community/community.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpaceAboutMembership {
  roleSet!: IRoleSet;
  community!: ICommunity;
}
