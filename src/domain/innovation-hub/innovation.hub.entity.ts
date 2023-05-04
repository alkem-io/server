import { Column, Entity } from 'typeorm';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { HubVisibility } from '@common/enums/hub.visibility';
import { InnovationHubType } from './innovation.hub.type.enum';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';

@Entity()
export class InnovationHub extends NameableEntity implements IInnovationHub {
  // A subdomain can be up to 255 characters long,
  // but if you have multiple levels in your subdomain,
  // each level can only be 63 characters long.
  // todo: discuss length
  @Column('varchar', {
    length: 255,
    unique: true,
  })
  subdomain!: string;

  @Column()
  type!: InnovationHubType;

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  spaceVisibilityFilter?: HubVisibility;

  // todo: m2m ??
  @Column('simple-array', {
    nullable: true,
    // transformer: InnovationHubSpaceListerFilterTransformer,
    transformer: {
      // todo use InnovationHubSpaceListerFilterTransformer
      from: (value?: string) => value?.split(','),
      to: (value?: string[]) => value?.join(','),
    },
  })
  spacesListFilter?: string[];
}
