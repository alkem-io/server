import { SchemaDirectiveVisitor } from 'apollo-server-express';
import {
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { getDirectives, MapperKind, mapSchema } from 'graphql-tools';
import { ConstraintNumberType } from './types/ConstraintNumberType';
import { ConstraintStringType } from './types/ConstraintStringType';

export class ConstraintDirective extends SchemaDirectiveVisitor {
  private constraintTypes: Record<
    string,
    ConstraintStringType | ConstraintNumberType
  > = {};

  getConstraintType(
    type: any,
    fieldName: string,
    notNull: boolean,
    directiveArgumentMap: Record<string, string>
  ) {
    let uniqueTypeName;
    if (directiveArgumentMap.uniqueTypeName) {
      uniqueTypeName = directiveArgumentMap.uniqueTypeName.replace(/\W/g, '');
    } else {
      uniqueTypeName =
        `${fieldName}_${type.name}_${notNull ? 'NotNull_' : ''}` +
        Object.entries(directiveArgumentMap)
          .map(
            ([key, value]) => `${key}_${value.toString().replace(/\W/g, '')}`
          )
          .join('_');
    }

    const constraintType = this.constraintTypes[uniqueTypeName];

    if (constraintType) return constraintType;

    if (type === GraphQLString) {
      return new ConstraintStringType(
        fieldName,
        uniqueTypeName,
        type,
        directiveArgumentMap
      );
    } else if (type === GraphQLFloat || type === GraphQLInt) {
      return new ConstraintNumberType(
        fieldName,
        uniqueTypeName,
        type,
        directiveArgumentMap
      );
    }
    throw new Error(`Not a valid scalar type: ${type.toString()}`);
  }

  wrapType(
    field:
      | GraphQLInputField
      | GraphQLField<any, any>
      | GraphQLFieldConfig<any, any>
      | GraphQLInputFieldConfig,
    args: Record<string, any>
  ) {
    if (
      field.type instanceof GraphQLNonNull &&
      field.type.ofType instanceof GraphQLScalarType
    ) {
      field.type = new GraphQLNonNull(
        this.getConstraintType(
          field.type.ofType,
          field.astNode?.name.value || '',
          true,
          args
        )
      );
    } else if (field.type instanceof GraphQLScalarType) {
      field.type = this.getConstraintType(
        field.type,
        field.astNode?.name.value || '',
        false,
        args
      );
    } else {
      throw new Error(`Not a scalar type: ${field.type}`);
    }
  }

  visitInputFieldDefinition(field: GraphQLInputField) {
    this.wrapType(field, this.args);
    return field;
  }

  visitFieldDefinition(
    field: GraphQLField<any, any>
  ): GraphQLField<any, any> | void | null {
    this.wrapType(field, this.args);
    return field;
  }
}

export const transformSchema = (schema: GraphQLSchema) => {
  // in order to work the schema needs to be remapped
  return mapSchema(schema, {
    [MapperKind.FIELD]: fieldConfig => {
      const directives = getDirectives(schema, fieldConfig);
      const directiveArgumentMap = directives.constraint;
      if (directiveArgumentMap) {
        // wrapType(fieldConfig, directiveArgumentMap); ATS: Not need in code first approach.
        return fieldConfig;
      }
    },
  });
};

export const constraintDirectiveTypeDefs = `
  directive @constraint(
    # String constraints
    minLength: Int
    maxLength: Int
    startsWith: String
    endsWith: String
    contains: String
    notContains: String
    pattern: String
    format: String

    # Number constraints
    min: Int
    max: Int
    exclusiveMin: Int
    exclusiveMax: Int
    multipleOf: Int
    uniqueTypeName: String
  ) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION`;
