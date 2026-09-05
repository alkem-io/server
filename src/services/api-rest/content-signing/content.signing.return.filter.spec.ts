import { LogContext } from '@common/enums';
import { UnauthenticatedHttpException } from '@common/exceptions/http';
import { ContentSigningReturnFilter } from './content.signing.return.filter';

describe('ContentSigningReturnFilter', () => {
  it('restores login to the exact local return URL without caching or a referrer', () => {
    const response = { set: vi.fn(), redirect: vi.fn(), headersSent: false };
    const request = {
      originalUrl:
        '/rest/content-signing/complete?correlationId=corr&clientState=opaque',
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };

    new ContentSigningReturnFilter().catch(
      new UnauthenticatedHttpException('expired', LogContext.AUTH),
      host as any
    );

    expect(response.set).toHaveBeenCalledWith({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      `/login?returnUrl=${encodeURIComponent(`/api/public${request.originalUrl}`)}`
    );
  });

  it.each([
    [
      { url: '/rest/content-signing/complete' },
      '/api/public/rest/content-signing/complete',
    ],
    [{}, '/api/public/'],
  ])('uses the available stripped request path %#', (request, returnUrl) => {
    const response = { set: vi.fn(), redirect: vi.fn(), headersSent: false };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };

    new ContentSigningReturnFilter().catch(
      new UnauthenticatedHttpException('expired', LogContext.AUTH),
      host as any
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      `/login?returnUrl=${encodeURIComponent(returnUrl)}`
    );
  });

  it('does not write a second response after headers were sent', () => {
    const response = { set: vi.fn(), redirect: vi.fn(), headersSent: true };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: vi.fn(),
      }),
    };

    new ContentSigningReturnFilter().catch(
      new UnauthenticatedHttpException('expired', LogContext.AUTH),
      host as any
    );

    expect(response.set).not.toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
  });
});
