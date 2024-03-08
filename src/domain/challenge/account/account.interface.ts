import { ObjectType } from '@nestjs/graphql';
import { ITemplatesSet } from '@domain/template/templates-set';
import { ILicense } from '@domain/license/license/license.interface';
import { IJourney } from '../base-challenge/journey.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';

@ObjectType('Account', {
  implements: () => [IJourney],
})
export class IAccount extends IAuthorizable {
  library?: ITemplatesSet;
  defaults?: ISpaceDefaults;
  license?: ILicense;
}
