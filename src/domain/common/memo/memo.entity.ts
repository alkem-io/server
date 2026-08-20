import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { NameableEntity } from '../entity/nameable-entity/nameable.entity';
import { IMemo } from './memo.interface';

@Entity()
export class Memo extends NameableEntity implements IMemo {
  // The inline `content` column (Yjs-V2 snapshot, `bytea`) is DROPPED
  // (006-collab-content-unification, R2/FR-005), mirroring the Whiteboard entity:
  // memo content is stored ONLY as a Yjs-V2 snapshot in the document's own storage
  // bucket, located by `contentPointer`. Mapping it would make TypeORM SELECT a
  // column the DropMemoAndWhiteboardContent migration removed (breaking every load).

  /**
   * The file-service id of this memo's stored Yjs-V2 snapshot — file-service is the
   * single storage backend for the Alkemio stack. Part of the unified
   * metadata/index (FR-001).
   */
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  contentPointer?: string;

  /**
   * The collaboration content version owned by the collaboration-service room
   * (the contract `version`). The room bumps it per persisted snapshot, sends
   * it on `collaboration-save`, and adopts the stored value back on
   * `collaboration-fetch` when it rehydrates (FR-004, data-model.md §metadata).
   *
   * Distinct from the inherited TypeORM `@VersionColumn` (`version`), which is a
   * server-internal optimistic-locking counter and MUST NOT be conflated with
   * this contract value.
   */
  @Column('int', { nullable: true })
  contentVersion?: number;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  contentUpdatePolicy!: ContentUpdatePolicy;

  @OneToOne(
    () => CalloutFraming,
    framing => framing.memo,
    {
      nullable: true,
    }
  )
  framing?: CalloutFraming;

  @OneToOne(
    () => CalloutContribution,
    contribution => contribution.memo,
    {
      nullable: true,
    }
  )
  contribution?: CalloutContribution;
}
