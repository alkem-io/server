import { SMALL_TEXT_LENGTH } from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Column, Entity, Generated, Index } from 'typeorm';
import { PlatformAuditCategory } from './enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import {
  IPlatformAuditEntry,
  PlatformAuditDetails,
} from './platform.audit.entry.interface';

@Entity({ name: 'platform_audit_entry' })
@Index('ix_platform_audit_entry_subject_category_created', [
  'subjectUserId',
  'category',
  'createdDate',
])
@Index('ix_platform_audit_entry_subject_category_rowid', [
  'subjectUserId',
  'category',
  'rowId',
])
@Index('ix_platform_audit_entry_correlation', ['correlationId'], {
  where: '"correlationId" IS NOT NULL',
})
export class PlatformAuditEntry
  extends BaseAlkemioEntity
  implements IPlatformAuditEntry
{
  @Column({ unique: true, nullable: false })
  @Generated('increment')
  rowId!: number;

  @Column({
    type: 'enum',
    enum: PlatformAuditCategory,
    enumName: 'platform_audit_category',
    nullable: false,
  })
  category!: PlatformAuditCategory;

  @Column('uuid', { nullable: false })
  subjectUserId!: string;

  @Column('uuid', { nullable: true })
  initiatorUserId?: string;

  @Column({
    type: 'enum',
    enum: PlatformAuditInitiatorRole,
    enumName: 'platform_audit_initiator_role',
    nullable: false,
  })
  initiatorRole!: PlatformAuditInitiatorRole;

  @Column({
    type: 'enum',
    enum: PlatformAuditOutcome,
    enumName: 'platform_audit_outcome',
    nullable: false,
  })
  outcome!: PlatformAuditOutcome;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  failureReason?: string;

  @Column('uuid', { nullable: true })
  correlationId?: string;

  @Column('jsonb', { nullable: true })
  details?: PlatformAuditDetails;
}
