import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { ICommunityPolicy } from './community.policy.interface';

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

  flags!: Map<CommunityPolicyFlag, boolean>;

  constructor(member: string, lead: string, host: string, admin: string) {
    super();
    this.member = member;
    this.lead = lead;
    this.admin = admin;
    this.host = host;
    this.flags = new Map();
    // todo: example, remove later
    this.flags.set(CommunityPolicyFlag.ALLOW_ANONYMOUS_READ_ACCESS, true);
  }
}
