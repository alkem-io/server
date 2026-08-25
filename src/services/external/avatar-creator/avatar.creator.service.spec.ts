import { MimeFileType } from '@common/enums/mime.file.type';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import axios from 'axios';
import {
  AvatarCreatorService,
  DEFAULT_AVATAR_SERVICE_URL,
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
    it('should send an explicit non-axios User-Agent so image CDNs do not block the request', async () => {
      // media.licdn.com (LinkedIn avatars) answers 403 to the default
      // `User-Agent: axios/<version>` that the Node adapter sends.
      const getSpy = vi
        .spyOn(axios, 'get')
        .mockResolvedValue({ data: Buffer.from('image'), status: 200 } as any);

      await service.urlToBuffer('https://media.licdn.com/dms/image/v2/abc');

      const config = getSpy.mock.calls[0][1] as Record<string, any>;
      const userAgent = config?.headers?.['User-Agent'];
      expect(userAgent).toBeDefined();
      expect(userAgent).not.toMatch(/axios/i);
    });
  });
});
