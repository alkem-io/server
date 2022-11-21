import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { isCID } from 'cids';

@Scalar('CID')
export class CID implements CustomScalar<string, string> {
  description = 'A Content identifier for IPFS(CID).';

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

  validate = (value: any) => {
    if (typeof value !== 'string') {
      throw new ValidationException(
        `CID must be a string: ${value}`,
        LogContext.API
      );
    }

    if (!CID.isValidFormat(value))
      throw new ValidationException(`CID not valid: ${value}`, LogContext.API);

    return value;
  };

  static isValidFormat = (value: any) => {
    // return isCID(value);
    return true;
  };
}
