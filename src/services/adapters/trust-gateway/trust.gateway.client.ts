import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import type { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

type StartResponse = {
  redirectUrl?: unknown;
  correlationId?: unknown;
  expiresAt?: unknown;
};

type GatewayStatus = { status: string; reason?: string };

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
      .getOrThrow('trustGateway.url', { infer: true })
      .replace(/\/$/, '');
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

  async getStatus(correlationId: string): Promise<GatewayStatus | undefined> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<unknown>(`${this.baseUrl}/v1/sign/status`, {
          params: { correlationId },
          timeout: 30_000,
        })
      );
      const data = response.data;
      if (!data || Array.isArray(data) || typeof data !== 'object')
        throw this.invalidResponse();
      const { status, reason } = data as Record<string, unknown>;
      if (
        typeof status !== 'string' ||
        (reason !== undefined && typeof reason !== 'string')
      )
        throw this.invalidResponse();
      return data as GatewayStatus;
    } catch (error) {
      if (
        (error as { response?: { status?: number } }).response?.status === 404
      )
        return undefined;
      throw error;
    }
  }

  async getResult(correlationId: string) {
    let response: AxiosResponse<ArrayBuffer>;
    try {
      response = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(`${this.baseUrl}/v1/sign/result`, {
          params: { correlationId },
          responseType: 'arraybuffer',
          timeout: 30_000,
        })
      );
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status === 409) return null;
      if (status === 404) return undefined;
      throw error;
    }
    const pdf = Buffer.from(response.data);
    const encodedEvidence = response.headers['x-signature-evidence'];
    if (
      !pdf.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
      typeof encodedEvidence !== 'string'
    )
      throw this.invalidResponse();
    let evidence: unknown;
    try {
      evidence = JSON.parse(
        Buffer.from(encodedEvidence, 'base64').toString('utf8')
      );
    } catch {
      throw this.invalidResponse();
    }
    if (!evidence || Array.isArray(evidence) || typeof evidence !== 'object')
      throw this.invalidResponse();
    return { pdf, evidence: evidence as Record<string, unknown> };
  }

  private invalidResponse(): ValidationException {
    return new ValidationException(
      'Invalid gateway response',
      LogContext.MEMOS
    );
  }
}
