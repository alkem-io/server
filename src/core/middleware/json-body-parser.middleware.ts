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
    if (req.path === '/rest/mcp' || req.path === '/rest/mcp/') {
      return mcpBodyParser(req, res, next);
    }

    return jsonBodyParser(req, res, next);
  };
};
