import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { ICommunityPolicy } from './community.policy.interface';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Entity()
export class CommunityPolicy
  extends BaseAlkemioEntity
  implements ICommunityPolicy
{
  @Column('text')
  member!: string;

  @Column('text')
  lead!: string;

  @Column('text')
  admin!: string;

  settings!: ISpaceSettings;

  constructor(member: string, lead: string, admin: string) {
    super();
    this.member = member;
    this.lead = lead;
    this.admin = admin;
  }
}
