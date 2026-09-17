import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, Index } from 'typeorm';
import { SigningAttemptStatus } from './signing.attempt.status';

@Entity('signing_attempt')
@Index('IDX_signing_attempt_memo_status', ['memoId', 'status'])
@Index('IDX_signing_attempt_status_expiresAt', ['status', 'expiresAt'])
@Index('IDX_signing_attempt_status_createdDate', ['status', 'createdDate'])
@Index('IDX_signing_attempt_snapshotDocumentId', ['snapshotDocumentId'])
@Index('IDX_signing_attempt_signedDocumentId', ['signedDocumentId'])
@Index('UQ_signing_attempt_correlationId', ['correlationId'], { unique: true })
@Index('UQ_signing_attempt_clientStateHash', ['clientStateHash'], {
  unique: true,
})
export class SigningAttempt extends BaseAlkemioEntity {
  @Column('uuid', { nullable: false })
  memoId!: string;

  @Column('uuid', { nullable: false })
  actorId!: string;

  @Column('varchar', { length: 64, nullable: true })
  contentSha256?: string;

  @Column('uuid', { nullable: true })
  snapshotDocumentId?: string | null;

  @Column('text', { nullable: true })
  correlationId?: string;

  @Column('timestamptz', { nullable: true })
  expiresAt?: Date;

  @Column('varchar', { length: 64, nullable: true })
  clientStateHash?: string;

  @Column({
    type: 'enum',
    enum: SigningAttemptStatus,
    nullable: false,
    default: SigningAttemptStatus.PENDING,
  })
  status!: SigningAttemptStatus;

  @Column('uuid', { nullable: true })
  signedDocumentId?: string;

  @Column('jsonb', { nullable: true })
  signerEvidence?: object;
}
