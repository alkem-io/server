import { Column, Entity, ManyToOne } from 'typeorm';
import { Context } from '@domain/context/context/context.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IVisual } from './visual.interface';

@Entity()
export class Visual extends AuthorizableEntity implements IVisual {
  @Column()
  name: string;

  @Column('text')
  uri: string;

  @Column('int')
  minWidth!: number;

  @Column('int')
  maxWidth!: number;

  @Column('int')
  minHeigt!: number;

  @Column('int')
  maxHeight!: number;

  @Column('int')
  aspectRatio!: number;

  @Column('simple-array')
  allowedTypes: string[];

  @ManyToOne(() => Context, context => context.visuals, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  constructor(name: string, uri: string) {
    super();
    this.name = name;
    this.uri = uri || '';
    this.allowedTypes = this.createDefaultAllowedTypes();
  }

  private createDefaultAllowedTypes(): string[] {
    return ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  }
}
