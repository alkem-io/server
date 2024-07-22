import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity } from 'typeorm';
import { ILibrary } from './library.interface';
@Entity()
export class Library extends AuthorizableEntity implements ILibrary {}
