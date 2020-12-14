import { Request, Response } from 'express';

export function dataManagementMiddleware(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/ban-types
  next: Function
) {
  if (req.originalUrl && req.originalUrl.split('/').pop() === 'favicon.ico') {
    res.sendStatus(204);
  }
  return next();
}
