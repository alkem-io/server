import { json } from 'body-parser';
import { RequestHandler } from 'express';

/**
 * The MCP transport parses its own request body. Other routes under the MCP
 * prefix, such as API key management, use Nest's regular JSON DTO handling.
 */
export const createJsonBodyParserMiddleware = (
  limit: string
): RequestHandler => {
  const jsonBodyParser = json({ limit });

  return (req, res, next) => {
    if (req.path === '/rest/mcp' || req.path === '/rest/mcp/') {
      return next();
    }

    return jsonBodyParser(req, res, next);
  };
};
