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
// 027-platform-role-redesign (D13, T015): the ONE table change this feature
// spends. Partial index — most rows carry a user subject, not an org one.
@Index(
  'ix_platform_audit_entry_subject_org_category_created',
  ['subjectOrganizationId', 'category', 'createdDate'],
  { where: '"subjectOrganizationId" IS NOT NULL' }
)
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

  // 027-platform-role-redesign (D13): relaxed to nullable — a role grant to
  // an ORGANIZATION has no subject user. At most one of subjectUserId /
  // subjectOrganizationId is non-null per row, enforced at the service layer
  // (T026, not a CHECK constraint — consistent with how outcome subsets are
  // already enforced), and documented per-category in each writer.
  @Column('uuid', { nullable: true })
  subjectUserId?: string;

  // 027-platform-role-redesign (D13): the organization-target counterpart to
  // subjectUserId, for role grants/revokes whose subject is an organization
  // (FR-026). Never both non-null on the same row.
  @Column('uuid', { nullable: true })
  subjectOrganizationId?: string;

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
