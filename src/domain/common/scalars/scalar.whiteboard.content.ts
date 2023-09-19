import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { validateExcalidrawContent } from '@core/validation/excalidraw/validateExcalidrawContent';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { ErrorObject } from 'ajv';

const WHITEBOARD_CONTENT_LENGTH = 8388608;

@Scalar('WhiteboardContent')
export class WhiteboardContent implements CustomScalar<string, string> {
  description = 'Content of a Whiteboard, as JSON.';

  parseValue(value: unknown): string {
    return WhiteboardContent.validate(value);
  }

  serialize(value: any): string {
    return value; // value sent to the client
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING) {
      return WhiteboardContent.validate(ast.value);
    }
    return '';
  }

  static validate(value: any) {
    if (typeof value !== 'string') {
      throw new ValidationException(
        'Whiteboard content is not string',
        LogContext.API
      );
    }

    if (value.length >= WHITEBOARD_CONTENT_LENGTH) {
      throw new ValidationException(
        `Whiteboard content is too long: ${value.length}, allowed length: ${WHITEBOARD_CONTENT_LENGTH}`,
        LogContext.API
      );
    }

    // todo: json validation can be expanded
    const errors = validateExcalidrawContent(value);

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
        `Value is not valid excalidraw content definition: ${message}`,
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
