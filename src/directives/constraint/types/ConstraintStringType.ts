import { ConstraintValidationError } from '../error/ConstraintValidationError';
import { GraphQLScalarType } from 'graphql';
import validator from 'validator';
import formats from '../formats';

export class ConstraintStringType extends GraphQLScalarType {
  constructor(
    fieldName: string,
    uniqueTypeName: string,
    type: any,
    args: Record<string, any>
  ) {
    super({
      name: uniqueTypeName,
      serialize(value) {
        value = type.serialize(value);

        validate(fieldName, args, value);

        return value;
      },
      parseValue(value) {
        value = type.serialize(value);

        validate(fieldName, args, value);

        return type.parseValue(value);
      },
      parseLiteral(ast) {
        const value = type.parseLiteral(ast);

        validate(fieldName, args, value);

        return value;
      },
    });
  }
}

export function validate(
  fieldName: string,
  args: Record<string, any>,
  value: any
) {
  const { contains, isLength } = validator;
  if (args.minLength && !isLength(value, { min: args.minLength })) {
    throw new ConstraintValidationError(
      fieldName,
      `Must be at least ${args.minLength} characters in length`,
      [{ arg: 'minLength', value: args.minLength }]
    );
  }
  if (args.maxLength && !isLength(value, { max: args.maxLength })) {
    throw new ConstraintValidationError(
      fieldName,
      `Must be no more than ${args.maxLength} characters in length`,
      [{ arg: 'maxLength', value: args.maxLength }]
    );
  }

  if (args.startsWith && !value.startsWith(args.startsWith)) {
    throw new ConstraintValidationError(
      fieldName,
      `Must start with ${args.startsWith}`,
      [{ arg: 'startsWith', value: args.startsWith }]
    );
  }

  if (args.endsWith && !value.endsWith(args.endsWith)) {
    throw new ConstraintValidationError(
      fieldName,
      `Must end with ${args.endsWith}`,
      [{ arg: 'endsWith', value: args.endsWith }]
    );
  }

  if (args.contains && !contains(value, args.contains)) {
    throw new ConstraintValidationError(
      fieldName,
      `Must contain ${args.contains}`,
      [{ arg: 'contains', value: args.contains }]
    );
  }

  if (args.notContains && contains(value, args.notContains)) {
    throw new ConstraintValidationError(
      fieldName,
      `Must not contain ${args.notContains}`,
      [{ arg: 'notContains', value: args.notContains }]
    );
  }

  if (args.pattern && !new RegExp(args.pattern).test(value)) {
    throw new ConstraintValidationError(
      fieldName,
      `Must match ${args.pattern}`,
      [{ arg: 'pattern', value: args.pattern }]
    );
  }

  if (args.format) {
    const formatter = formats(args.format);

    if (!formatter) {
      throw new ConstraintValidationError(
        fieldName,
        `Invalid format type ${args.format}`,
        [{ arg: 'format', value: args.format }]
      );
    }

    try {
      formatter(value); // Will throw if invalid
    } catch (e) {
      throw new ConstraintValidationError(fieldName, e.message, [
        { arg: 'format', value: args.format },
      ]);
    }
  }
}
