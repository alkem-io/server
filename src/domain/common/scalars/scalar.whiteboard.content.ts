import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

const WHITEBOARD_CONTENT_LENGTH = 8388608;
// A base64 payload: the standard alphabet plus optional `=` padding. The empty
// string is allowed (a never-edited whiteboard carries no snapshot).
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

@Scalar('WhiteboardContent')
export class WhiteboardContent implements CustomScalar<string, string> {
  description =
    'Content of a Whiteboard as a base64-encoded Yjs-V2 document snapshot (CRDT state, not an Excalidraw scene).';

  parseValue(value: unknown): string {
    return WhiteboardContent.validate(value);
  }

  serialize(value: any): string {
    return value; // value sent to the client (base64 Yjs-V2 snapshot)
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
        'Whiteboard content is not a string',
        LogContext.API
      );
    }

    if (value.length >= WHITEBOARD_CONTENT_LENGTH) {
      throw new ValidationException(
        `Whiteboard content is too long: ${value.length}, allowed length: ${WHITEBOARD_CONTENT_LENGTH}`,
        LogContext.API
      );
    }

    // The content is an opaque base64-encoded Yjs-V2 snapshot — the single CRDT
    // representation the editor and collaboration-service own. No Excalidraw
    // scene/JSON crosses this boundary, so the only structural check is base64.
    if (value !== '' && !BASE64_RE.test(value)) {
      throw new ValidationException(
        'Whiteboard content must be a base64-encoded Yjs-V2 snapshot',
        LogContext.API
      );
    }

    return value;
  }
}
