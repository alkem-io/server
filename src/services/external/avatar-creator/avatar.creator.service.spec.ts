import { MimeFileType } from '@common/enums/mime.file.type';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import axios from 'axios';
import {
  AvatarCreatorService,
  DEFAULT_AVATAR_SERVICE_URL,
  IMAGE_FETCH_ERROR_MESSAGE,
  IMAGE_FETCH_USER_AGENT,
} from './avatar.creator.service';

describe('AvatarCreatorService', () => {
  let service: AvatarCreatorService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AvatarCreatorService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AvatarCreatorService);
  });

  describe('generateRandomAvatarURL', () => {
    it('should generate URL with only firstName when lastName is not provided', () => {
      const url = service.generateRandomAvatarURL('John');

      expect(url).toContain(DEFAULT_AVATAR_SERVICE_URL);
      expect(url).toContain('name=john');
      expect(url).toContain('color=ffffff');
      expect(url).toContain('size=200');
    });

    it('should generate URL with firstName and lastName when both are provided', () => {
      const url = service.generateRandomAvatarURL('John', 'Doe');

      expect(url).toContain(DEFAULT_AVATAR_SERVICE_URL);
      expect(url).toContain('name=john+doe');
      expect(url).toContain('color=ffffff');
      expect(url).toContain('size=200');
    });

    it('should strip special characters from firstName', () => {
      const url = service.generateRandomAvatarURL('Jöhn!@#');

      expect(url).toContain(DEFAULT_AVATAR_SERVICE_URL);
      // Umlauts are replaced, special chars stripped
      expect(url).toMatch(/name=[a-z0-9-]+/);
      expect(url).not.toMatch(/name=.*[!@#]/);
    });

    it('should strip special characters from both names', () => {
      const url = service.generateRandomAvatarURL('Müller', 'Ström');

      expect(url).toContain('name=');
      // Verify no special characters remain
      const nameMatch = url.match(/name=([^&]+)/);
      expect(nameMatch).toBeTruthy();
      // The "+" separates first and last name
      expect(nameMatch![1]).toMatch(/^[a-z0-9-]+\+[a-z0-9-]+$/);
    });

    it('should include a random hex background color', () => {
      const url = service.generateRandomAvatarURL('Test');

      expect(url).toMatch(/background=[0-9a-f]+/);
    });
  });

  describe('getFileType', () => {
    it('should return PNG mime type regardless of buffer content', async () => {
      const buffer = Buffer.from('test');

      const result = await service.getFileType(buffer);

      expect(result).toBe(MimeFileType.PNG);
    });
  });

  describe('urlToBuffer', () => {
    const SIGNED_AVATAR_URL =
      'https://media.licdn.com/dms/image/v2/abc?e=1234&v=beta&t=SIGNING-TOKEN';

    it('should send the full CDN-compatibility header contract so image CDNs do not block the request', async () => {
      // media.licdn.com (LinkedIn avatars) answers 403 to the default
      // `User-Agent: axios/<version>` that the Node adapter sends.
      const getSpy = vi
        .spyOn(axios, 'get')
        .mockResolvedValue({ data: Buffer.from('image'), status: 200 } as any);

      await service.urlToBuffer(SIGNED_AVATAR_URL);

      const config = getSpy.mock.calls[0][1] as Record<string, any>;
      expect(config?.headers?.['User-Agent']).toBe(IMAGE_FETCH_USER_AGENT);
      expect(config?.headers?.Accept).toBe('image/*');
      // The whole point of the override: never the axios default.
      expect(IMAGE_FETCH_USER_AGENT).not.toMatch(/axios/i);
    });

    it('should keep the source URL out of the failure message when the download is rejected', async () => {
      // The URL carries a provider signing token and callers log this error,
      // so the message must stay static and the status must ride structurally.
      const rejection: any = new Error('Request failed with status code 403');
      rejection.response = { status: 403 };
      vi.spyOn(axios, 'get').mockRejectedValue(rejection);

      const error = await service
        .urlToBuffer(SIGNED_AVATAR_URL)
        .then(() => undefined)
        .catch((e: any) => e);

      expect(error.message).toBe(IMAGE_FETCH_ERROR_MESSAGE);
      expect(error.message).not.toContain('SIGNING-TOKEN');
      expect(error.message).not.toContain('media.licdn.com');
      expect(error.httpStatus).toBe(403);
      expect(error.cause).toBe(rejection);
    });

    it('should carry the transport failure code when the request never gets a status', async () => {
      const rejection: any = new Error('getaddrinfo ENOTFOUND media.licdn.com');
      rejection.code = 'ENOTFOUND';
      vi.spyOn(axios, 'get').mockRejectedValue(rejection);

      const error = await service
        .urlToBuffer(SIGNED_AVATAR_URL)
        .then(() => undefined)
        .catch((e: any) => e);

      expect(error.message).toBe(IMAGE_FETCH_ERROR_MESSAGE);
      expect(error.httpStatus).toBeUndefined();
      expect(error.errorCode).toBe('ENOTFOUND');
    });

    it('should keep the source URL out of the failure message on a non-200 response', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({
        data: Buffer.from(''),
        status: 404,
      } as any);

      const error = await service
        .urlToBuffer(SIGNED_AVATAR_URL)
        .then(() => undefined)
        .catch((e: any) => e);

      expect(error.message).toBe(IMAGE_FETCH_ERROR_MESSAGE);
      expect(error.message).not.toContain('SIGNING-TOKEN');
      expect(error.httpStatus).toBe(404);
    });
  });
});
