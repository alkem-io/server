import { Field, ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { ILicense } from '@domain/license/license/license.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { ISpace } from '../space/space.interface';

@ObjectType('Account')
export class IAccount extends IAuthorizable {
  library?: ITemplatesSet;
  defaults?: ISpaceDefaults;
  license?: ILicense;

  @Field(() => IAccount, {
    nullable: false,
    description: 'The root Space for this Account',
  })
  space?: ISpace;
}
