import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IAuthorizable } from './authorizable.interface';

export abstract class AuthorizableEntity
  extends BaseAlkemioEntity
  implements IAuthorizable
{
  authorization?: AuthorizationPolicy;
}
