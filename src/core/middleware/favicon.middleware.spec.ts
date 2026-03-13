import { vi } from 'vitest';
import { faviconMiddleware } from './favicon.middleware';

describe('faviconMiddleware', () => {
  it('should return 204 for favicon.ico requests', () => {
    const req = { originalUrl: '/favicon.ico' } as any;
    const end = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ end }) } as any;
    const next = vi.fn();

    faviconMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 204 for nested favicon.ico requests', () => {
    const req = { originalUrl: '/some/path/favicon.ico' } as any;
    const end = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ end }) } as any;
    const next = vi.fn();

    faviconMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
  });

  it('should call next for non-favicon requests', () => {
    const req = { originalUrl: '/graphql' } as any;
    const res = {} as any;
    const next = vi.fn();

    faviconMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should call next when originalUrl is undefined', () => {
    const req = { originalUrl: undefined } as any;
    const res = {} as any;
    const next = vi.fn();

    faviconMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
