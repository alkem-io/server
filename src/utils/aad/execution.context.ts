import { ExecutionContext, ArgumentsHost } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export enum ExecutionContextType {
  GQL,
  HTTP,
}

/**
 * Get Execution Context type
 * @see https://github.com/nestjs/nest/issues/1581
 */
export const getType = (context: ArgumentsHost) =>
  context.getArgs().length === 4
    ? ExecutionContextType.GQL
    : ExecutionContextType.HTTP;

/**
 * Get HTTP request object from Execution Context
 */
export const getRequest = (context: ExecutionContext) =>
  getType(context) === ExecutionContextType.GQL
    ? GqlExecutionContext.create(context).getContext().req // `req` object put here by Apollo server
    : context.switchToHttp().getRequest();
