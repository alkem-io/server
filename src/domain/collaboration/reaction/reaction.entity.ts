import { ReactionType } from '@common/enums/reaction.type';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { User } from '@domain/community/user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IReaction } from './reaction.interface';

/**
 * Generic reaction record: one person's emoji choice on one target entity.
 *
 * Not authorizable (no AuthorizationPolicy) — follows the poll-vote
 * precedent. Authorization is enforced at the mutation level.
 *
 * The target reference (entityID) is intentionally polymorphic with no
 * database foreign key: the target entity's delete flow is responsible for
 * removing all reactions for it before the target row is deleted.
 *
 * The creator reference has a real FK (ON DELETE CASCADE) so that removing
 * a user automatically removes all of their reactions.
 *
 * The unique constraint on (type, entityID, createdBy) ensures at most one
 * reaction per person per target, and its leading two columns (type, entityID)
 * serve the batched GROUP BY queries used by the tier-1 summary reader.
 */
@Entity()
@Unique(['type', 'entityID', 'createdBy'])
export class Reaction extends BaseAlkemioEntity implements IReaction {
  @Column('varchar', { length: 32, nullable: false })
  type!: ReactionType;

  @Column('uuid', { nullable: false })
  entityID!: string;

  @Column('uuid', { nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User;

  @Column('varchar', { length: 32, nullable: false })
  emoji!: string;
}
