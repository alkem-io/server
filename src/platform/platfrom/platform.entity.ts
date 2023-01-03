import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity } from 'typeorm';
import { IPlatform } from './platform.interface';

@Entity()
export class Platform extends AuthorizableEntity implements IPlatform {}
