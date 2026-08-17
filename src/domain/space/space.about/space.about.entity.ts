import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { ClassificationEntry } from '@domain/space/classification.entry/classification.entry.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ISpaceAbout } from './space.about.interface';

@Entity()
export class SpaceAbout extends AuthorizableEntity implements ISpaceAbout {
  @Column('text', { nullable: true })
  why?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidelines?: CommunityGuidelines;

  // Inverse side only — the FK lives on classification_entry.spaceAboutId
  // (ON DELETE CASCADE). No column here, no cascade: SpaceAboutAuthorizationService
  // must never be asked to load this relation (it hard-throws on a missing
  // child), which is exactly why entries carry no policy of their own
  // (operator ruling D1).
  @OneToMany(
    () => ClassificationEntry,
    entry => entry.spaceAbout,
    {
      eager: false,
      cascade: false,
    }
  )
  classifications?: ClassificationEntry[];
}
