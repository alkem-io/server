import { HttpException } from '@nestjs/common';
import { json } from 'body-parser';
import { RequestHandler } from 'express';

/**
 * MCP has a fixed decoded entity ceiling independent of other REST routes.
 */
export const createJsonBodyParserMiddleware = (
  limit: string
): RequestHandler => {
  const jsonBodyParser = json({ limit });
  const mcpBodyParser = json({ limit: '256kb' });

  return (req, res, next) => {
    if (/^\/rest\/mcp\/?$/i.test(req.path)) {
      return mcpBodyParser(req, res, error =>
        next(
          error
            ? new HttpException('Invalid MCP request body', error.status)
            : undefined
        )
      );
    }

    return jsonBodyParser(req, res, next);
  };
};
