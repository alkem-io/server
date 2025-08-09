import { Field, ObjectType } from '@nestjs/graphql';
import { IPlatformAccessRole } from './platform.access.role.interface';

@ObjectType('PlatformAccess')
export abstract class IPlatformAccess {
  @Field(() => [IPlatformAccessRole], {
    nullable: false,
    description: 'The platform roles with their associated privileges.',
  })
  roles!: IPlatformAccessRole[];
}
