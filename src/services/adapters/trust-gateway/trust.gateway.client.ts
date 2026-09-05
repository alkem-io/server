import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { firstValueFrom } from 'rxjs';

type StartResponse = {
  redirectUrl?: unknown;
  correlationId?: unknown;
  expiresAt?: unknown;
};

const RFC3339 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

@Injectable()
export class TrustGatewayClient {
  private readonly baseUrl: string;

  constructor(
    configService: ConfigService<AlkemioConfig, true>,
    private readonly httpService: HttpService
  ) {
    this.baseUrl = configService
      .get('trustGateway', { infer: true })
      .url.replace(/\/$/, '');
  }

  async start(document: Buffer, subject: string, clientState: string) {
    const response = await firstValueFrom(
      this.httpService.post<StartResponse>(
        `${this.baseUrl}/v1/sign/start`,
        {
          document: document.toString('base64'),
          conformanceLevel: 'B-T',
          expectedSigner: {
            matchOn: 'cleverbase_subject',
            value: subject,
          },
          clientState,
        },
        { timeout: 30_000 }
      )
    );
    const { redirectUrl, correlationId, expiresAt } = response.data;
    if (
      typeof redirectUrl !== 'string' ||
      typeof correlationId !== 'string' ||
      !correlationId ||
      typeof expiresAt !== 'string' ||
      !RFC3339.test(expiresAt)
    )
      throw this.invalidResponse();
    try {
      const url = new URL(redirectUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:')
        throw this.invalidResponse();
    } catch {
      throw this.invalidResponse();
    }
    // Gateway formats a real time.Time with time.RFC3339; Date parsing guards transport corruption.
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime())) throw this.invalidResponse();
    return { redirectUrl, correlationId, expiresAt: expiry };
  }

  private invalidResponse(): ValidationException {
    return new ValidationException(
      'Invalid gateway response',
      LogContext.MEMOS
    );
  }
}
