import { JoinColumn, OneToOne } from 'typeorm';
import { ITemplateBase } from '@domain/template/template-base/template.base.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';

export abstract class TemplateBase
  extends AuthorizableEntity
  implements ITemplateBase
{
  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;
}
