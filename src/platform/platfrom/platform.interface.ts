import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Platform')
export abstract class IPlatform extends IAuthorizable {}
