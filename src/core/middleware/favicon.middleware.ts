import { Request, Response } from 'express';

export function faviconMiddleware(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  next: Function
) {
  if (req.originalUrl && req.originalUrl.split('/').pop() === 'favicon.ico') {
    return res.status(204).end();
  }
  return next();
}
