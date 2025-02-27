import { IRoleSet } from '@domain/access/role-set';
import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpaceAboutMembership {
  roleSet!: IRoleSet;
}
