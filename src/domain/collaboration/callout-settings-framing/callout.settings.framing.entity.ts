import { Column, Entity } from 'typeorm';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { ICalloutSettingsFraming } from './callout.settings.framing.interface';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class CalloutSettingsFraming
  extends BaseAlkemioEntity
  implements ICalloutSettingsFraming
{
  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutFramingType.NONE,
  })
  type!: CalloutFramingType;

  @Column('boolean', {
    nullable: false,
    default: false,
  })
  commentsEnabled!: boolean;
}
