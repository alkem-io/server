import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { validateMachineDefinition } from '@core/validation/xstate/validateMachineDefinition';
import { ErrorObject } from 'ajv';

export const LIFECYCLE_DEFINITION_LENGTH = 8388608;

@Scalar('LifecycleDefinition')
export class LifecycleDefinitionScalar implements CustomScalar<string, string> {
  description =
    'A representation of a Lifecycle Definition, based on XState. It is serialized JSON.';

  parseValue(value: unknown): string {
    return this.validate(value);
  }

  serialize(value: any): string {
    return value; // value sent to the client
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      return this.validate(ast.value);
    }
    return '';
  }

  validate(value: any): string {
    if (typeof value !== 'string') {
      throw new ValidationException(
        `Value is not string: ${value}`,
        LogContext.API
      );
    }

    if (value.length >= LIFECYCLE_DEFINITION_LENGTH) {
      throw new ValidationException(
        `Lifecycle definition content is too long: ${value.length}, allowed length: ${LIFECYCLE_DEFINITION_LENGTH}`,
        LogContext.API
      );
    }

    const errors = validateMachineDefinition(value);

    if (errors) {
      let message: string;
      if (Array.isArray(errors)) {
        const errorTuple = Object.entries(formatErrors(errors));
        message = errorTuple
          .map(([path, messages]) => `${path}: ${messages.join(', ')}`)
          .join('; ');
      } else {
        message = errors.message;
      }
      throw new ValidationException(
        `Value is not valid xstate definition: ${message}`,
        LogContext.API
      );
    }

    return value;
  }
}

const formatErrors = (errors: ErrorObject[]) => {
  const map = errors.map(formatError).reduce((acc, { path, message }) => {
    const messages = acc.get(path) ?? [];
    messages.push(message);
    acc.set(path, messages);
    return acc;
  }, new Map<string, Array<string>>());
  return Object.fromEntries(map);
};

const formatError = (error: ErrorObject) => {
  return {
    path: error.instancePath.substring(1).replace(/\//g, '.'),
    message: error.message ?? '',
  };
};
