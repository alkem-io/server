import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import type { Mock } from 'vitest';

// Dynamic module-level bindings resolved in beforeAll
let ImageConversionService: any;
let mockedConvert: Mock;

beforeAll(async () => {
  vi.resetModules();
  vi.doMock('heic-convert', () => ({ default: vi.fn() }));
  const convMod = await import('heic-convert');
  mockedConvert = vi.mocked(convMod.default);
  const svcMod = await import('../image.conversion.service');
  ImageConversionService = svcMod.ImageConversionService;
});

describe('ImageConversionService', () => {
  let service: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ImageConversionService);
    vi.clearAllMocks();
  });

  describe('isHeicFormat', () => {
    it('should return true for image/heic MIME type', () => {
      expect(service.isHeicFormat('image/heic', 'photo.jpg')).toBe(true);
    });

    it('should return true for image/heif MIME type', () => {
      expect(service.isHeicFormat('image/heif', 'photo.jpg')).toBe(true);
    });

    it('should return true for .heic extension regardless of MIME type', () => {
      expect(
        service.isHeicFormat('application/octet-stream', 'photo.heic')
      ).toBe(true);
    });

    it('should return true for .heif extension regardless of MIME type', () => {
      expect(
        service.isHeicFormat('application/octet-stream', 'photo.heif')
      ).toBe(true);
    });

    it('should return false for image/jpeg', () => {
      expect(service.isHeicFormat('image/jpeg', 'photo.jpg')).toBe(false);
    });

    it('should return false for image/png', () => {
      expect(service.isHeicFormat('image/png', 'photo.png')).toBe(false);
    });

    it('should be case-insensitive for MIME type', () => {
      expect(service.isHeicFormat('IMAGE/HEIC', 'photo.jpg')).toBe(true);
    });

    it('should be case-insensitive for file extension', () => {
      expect(
        service.isHeicFormat('application/octet-stream', 'photo.HEIC')
      ).toBe(true);
    });
  });

  describe('convertIfNeeded', () => {
    it('should pass through non-HEIC buffers unchanged with converted: false', async () => {
      const buffer = Buffer.from('fake-jpeg-data');
      const result = await service.convertIfNeeded(
        buffer,
        'image/jpeg',
        'photo.jpg'
      );

      expect(result.converted).toBe(false);
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileName).toBe('photo.jpg');
      expect(mockedConvert).not.toHaveBeenCalled();
    });

    it('should reject HEIC files exceeding 15MB with ValidationException', async () => {
      const size = 15 * 1024 * 1024 + 1; // 15MB + 1 byte
      const buffer = Buffer.alloc(size);

      await expect(
        service.convertIfNeeded(buffer, 'image/heic', 'photo.heic')
      ).rejects.toThrow('HEIC');
    });

    it('should accept HEIC files exactly at 15MB', async () => {
      const size = 15 * 1024 * 1024; // exactly 15MB
      const buffer = Buffer.alloc(size);
      const fakeJpeg = Buffer.from('fake-jpeg-output');

      mockedConvert.mockResolvedValue(new ArrayBuffer(fakeJpeg.byteLength));

      const result = await service.convertIfNeeded(
        buffer,
        'image/heic',
        'photo.heic'
      );

      expect(result.converted).toBe(true);
    });

    it('should convert HEIC buffer and return JPEG result', async () => {
      const heicBuffer = Buffer.from('fake-heic-data');
      const jpegOutput = Buffer.from('fake-jpeg-output');

      mockedConvert.mockResolvedValue(
        jpegOutput.buffer.slice(
          jpegOutput.byteOffset,
          jpegOutput.byteOffset + jpegOutput.byteLength
        )
      );

      const result = await service.convertIfNeeded(
        heicBuffer,
        'image/heic',
        'photo.heic'
      );

      expect(result.converted).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileName).toBe('photo.jpg');
      expect(mockedConvert).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'JPEG',
          quality: 1,
        })
      );
    });

    it('should change .heif extension to .jpg', async () => {
      const buffer = Buffer.from('fake-heif-data');
      mockedConvert.mockResolvedValue(new ArrayBuffer(8));

      const result = await service.convertIfNeeded(
        buffer,
        'image/heif',
        'image.heif'
      );

      expect(result.fileName).toBe('image.jpg');
    });

    it('should wrap heic-convert errors in ValidationException with details', async () => {
      const buffer = Buffer.from('corrupted-heic');
      mockedConvert.mockRejectedValue(new Error('Invalid HEIC data'));

      try {
        await service.convertIfNeeded(buffer, 'image/heic', 'corrupted.heic');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.exceptionName).toBe('ValidationException');
        expect(error.message).toContain('Failed to convert HEIC image');
      }
    });

    it('should remain stateless after conversion failure', async () => {
      const corruptBuffer = Buffer.from('corrupted');
      mockedConvert.mockRejectedValueOnce(new Error('Bad data'));

      await expect(
        service.convertIfNeeded(corruptBuffer, 'image/heic', 'bad.heic')
      ).rejects.toThrow('Failed to convert HEIC image');

      // Subsequent calls should work fine
      const goodBuffer = Buffer.from('good-heic');
      mockedConvert.mockResolvedValueOnce(new ArrayBuffer(8));

      const result = await service.convertIfNeeded(
        goodBuffer,
        'image/heic',
        'good.heic'
      );
      expect(result.converted).toBe(true);
    });
  });
});
