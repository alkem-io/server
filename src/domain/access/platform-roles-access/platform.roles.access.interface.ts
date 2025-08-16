import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatformAccessRole } from './platform.roles.access.role.interface';

@ObjectType('PlatformRolesAccess')
export abstract class IPlatformRolesAccess {
  @Field(() => [IPlatformAccessRole], {
    nullable: false,
    description: 'The platform roles with their associated privileges.',
  })
  roles!: IPlatformAccessRole[];
}
