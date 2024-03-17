import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { ICommunityPolicy } from './community.policy.interface';
import { ISpaceSettings } from '@domain/challenge/space.settings/space.settings.interface';

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

  @Column('text')
  host!: string;

  settings!: ISpaceSettings;

  constructor(member: string, lead: string, host: string, admin: string) {
    super();
    this.member = member;
    this.lead = lead;
    this.admin = admin;
    this.host = host;
  }
}
