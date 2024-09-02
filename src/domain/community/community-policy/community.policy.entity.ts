import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { ICommunityPolicy } from './community.policy.interface';

@Entity()
export class CommunityPolicy
  extends BaseAlkemioEntity
  implements ICommunityPolicy
{
  @Column('text', { nullable: false })
  member!: string;

  @Column('text', { nullable: false })
  lead!: string;

  @Column('text', { nullable: false })
  admin!: string;

  constructor(member: string, lead: string, admin: string) {
    super();
    this.member = member;
    this.lead = lead;
    this.admin = admin;
  }
}
