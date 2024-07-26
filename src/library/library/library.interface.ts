import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('Library')
export abstract class ILibrary extends IAuthorizable {}
