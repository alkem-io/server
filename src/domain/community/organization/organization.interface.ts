import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IGroupable } from '@domain/common/interfaces/groupable.interface';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IActor, IActorFull } from '@domain/actor/actor/actor.interface';
import { NameID } from '@domain/common/scalars';
import { IProfile } from '@domain/common/profile/profile.interface';

@ObjectType('Organization', {
  implements: () => [IGroupable, IActorFull],
})
export class IOrganization extends IActor implements IActorFull {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  declare nameID: string;

  // Override to make profile required for contributors
  declare profile: IProfile;

  // Organization extends Actor - credentials are on Actor.credentials

  roleSet!: IRoleSet;
  accountID!: string;

  rowId!: number;

  settings!: IOrganizationSettings;

  groups?: IUserGroup[];

  @Field(() => String, {
    nullable: true,
    description: 'Legal name - required if hosting an Space',
  })
  legalEntityName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization website',
  })
  website?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Organization contact email',
  })
  contactEmail?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Domain name; what is verified, eg. alkem.io',
  })
  domain?: string;

  @Field(() => IOrganizationVerification, { nullable: false })
  verification?: IOrganizationVerification;

  storageAggregator?: IStorageAggregator;
}
