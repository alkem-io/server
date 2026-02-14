import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import {
  AvatarCreatorService,
  DEFAULT_AVATAR_SERVICE_URL,
} from './avatar.creator.service';
import { MimeFileType } from '@common/enums/mime.file.type';

describe('AvatarCreatorService', () => {
  let service: AvatarCreatorService;

  beforeEach(async () => {
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
});
