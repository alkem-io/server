import { GraphQLResolveInfo } from 'graphql';
import { Injectable, PipeTransform } from '@nestjs/common';
import { fieldsMap } from 'graphql-fields-list';

@Injectable()
/** Transforms {@link GraphQLResolveInfo} to string array of primitive fields.
 * Primitive fields are plain values like string, number, etc. e.g not objects */
export class QueryFieldsPipe implements PipeTransform {
  transform(value: GraphQLResolveInfo): string[] {
    const mapResult = fieldsMap(value);
    return Object.keys(mapResult).filter(key => !mapResult[key]);
  }
}
