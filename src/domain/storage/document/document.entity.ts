import {
  ENUM_LENGTH,
  EXTERNAL_REFERENCE_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants';
import { MimeFileType } from '@common/enums/mime.file.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Tagset } from '@domain/common/tagset';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { StorageBucket } from '../storage-bucket/storage.bucket.entity';
import { IDocument } from './document.interface';

/**
 * Both `externalReference` indexes below are created by migration
 * 1782299000000-FileExternalReference and MUST be declared here too (feature
 * 013). TypeORM emits a DROP for any DB index absent from entity metadata, so
 * without these declarations the next `migration:generate` would silently
 * produce a migration dropping the partial-uniqueness guarantee behind
 * by-reference resolution and the index behind every inbound attachment lookup.
 * They are PARTIAL (`WHERE "externalReference" IS NOT NULL`) — the same
 * reference legitimately recurs across buckets on a re-share, and every legacy
 * row's NULL must never collide — which is only expressible at class level, so
 * neither can be a property-level `@Index`.
 */
@Index('IDX_file_externalReference', ['externalReference'], {
  where: '"externalReference" IS NOT NULL',
})
@Index(
  'UQ_file_externalReference_storageBucketId',
  ['externalReference', 'storageBucket'],
  { unique: true, where: '"externalReference" IS NOT NULL' }
)
@Entity('file')
export class Document extends AuthorizableEntity implements IDocument {
  // toDo fix createdBy circular dependency https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/4529
  // omitting OneToOne decorator for createdBy to avoid circular dependency
  // needs a redesign to avoid circular dependency
  // @Index('FK_3337f26ca267009fcf514e0e726')
  // @OneToOne(() => User, {
  //   eager: false,
  //   cascade: true,
  //   onDelete: 'SET NULL',
  // })
  // @JoinColumn()
  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Index('IDX_file_storageBucketId')
  @ManyToOne(
    () => StorageBucket,
    storage => storage.documents,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  storageBucket!: StorageBucket;

  @OneToOne(() => Tagset, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  tagset!: Tagset;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  displayName!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  mimeType!: MimeFileType;

  @Column('int', { nullable: false })
  size!: number;

  @Index('IDX_file_externalID')
  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  externalID!: string;

  // Opaque, caller-supplied reference owned/written by file-service (feature
  // 013). Mapped READ-ONLY here (all `file` writes go through FileServiceAdapter
  // per DocumentWriteGuard) so the server can honour the coalesce "never
  // overwrite an existing reference" invariant without an extra round-trip.
  // Column created by migration 1782299000000-FileExternalReference (varchar 256).
  @Column('varchar', { length: EXTERNAL_REFERENCE_LENGTH, nullable: true })
  externalReference?: string;

  @Column('boolean', { nullable: false, default: false })
  temporaryLocation!: boolean;
}
