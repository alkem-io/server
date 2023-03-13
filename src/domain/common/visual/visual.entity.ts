import { Column, Entity, ManyToOne } from 'typeorm';
import { Context } from '@domain/context/context/context.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IVisual } from './visual.interface';
import { Profile } from '@domain/common/profile/profile.entity';

@Entity()
export class Visual extends AuthorizableEntity implements IVisual {
  @Column()
  name!: string;

  @Column('text')
  uri!: string;

  @Column('int')
  minWidth!: number;

  @Column('int')
  maxWidth!: number;

  @Column('int')
  minHeight!: number;

  @Column('int')
  maxHeight!: number;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  aspectRatio!: number;

  @Column('simple-array')
  allowedTypes: string[];

  @ManyToOne(() => Profile, profile => profile.visuals, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  profile?: Profile;

  @ManyToOne(() => Context, context => context.visuals, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  constructor() {
    super();
    this.allowedTypes = this.createDefaultAllowedTypes();
    this.minHeight = 0;
    this.maxHeight = 0;
    this.minWidth = 0;
    this.maxWidth = 0;
    this.aspectRatio = 1;
  }

  private createDefaultAllowedTypes(): string[] {
    return ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  }
}
