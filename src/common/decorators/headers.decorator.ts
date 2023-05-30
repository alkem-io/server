import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/***
 * Injects header information from the request object.
 * Returns all the headers as a key, value pair.
 */
export function Headers(): ParameterDecorator;
/***
 * Injects header information from the request object.
 * Returns the value of the header or NULL.
 */
export function Headers(header: string): ParameterDecorator;
export function Headers(header?: string): ParameterDecorator {
  return createParamDecorator((data, context: ExecutionContext) => {
    const ctx =
      GqlExecutionContext.create(context).getContext<IGraphQLContext>();

    return header ? ctx.req.headers[header] : ctx.req.headers;
  })(header);
}
