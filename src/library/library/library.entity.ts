import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ILibrary } from './library.interface';

export class Library extends AuthorizableEntity implements ILibrary {}
