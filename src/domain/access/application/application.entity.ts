import { RoleSet } from '@domain/access/role-set/role.set.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { IQuestion } from '@domain/common/question/question.interface';
import { User } from '@domain/community/user/user.entity';
import { IApplication } from './application.interface';

export class Application extends AuthorizableEntity implements IApplication {
  lifecycle!: Lifecycle;

  questions?: IQuestion[];

  user?: User;

  roleSet?: RoleSet;
}
