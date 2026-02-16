import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

// Mock sharp via vi.doMock to avoid module cache issues with isolate: false
const mockToBuffer = vi.fn();
const mockJpeg = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
const mockResize = vi.fn().mockReturnValue({ jpeg: mockJpeg });
const mockMetadata = vi.fn();

const mockSharpInstance = {
  metadata: mockMetadata,
  resize: mockResize,
  jpeg: mockJpeg,
  toBuffer: mockToBuffer,
};

// Dynamic module-level binding resolved in beforeAll
let ImageCompressionService: any;

beforeAll(async () => {
  vi.resetModules();
  vi.doMock('sharp', () => ({
    default: vi.fn(() => mockSharpInstance),
  }));
  const svcMod = await import('../image.compression.service');
  ImageCompressionService = svcMod.ImageCompressionService;
});

describe('ImageCompressionService', () => {
  let service: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageCompressionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ImageCompressionService);
    vi.clearAllMocks();

    // Reset chain: metadata → resize/jpeg → toBuffer
    mockMetadata.mockResolvedValue({ width: 2000, height: 1500 });
    mockJpeg.mockReturnValue({ toBuffer: mockToBuffer });
    mockResize.mockReturnValue({ jpeg: mockJpeg });
  });

  describe('isCompressibleFormat', () => {
    it('should return false for image/svg+xml', () => {
      expect(service.isCompressibleFormat('image/svg+xml')).toBe(false);
    });

    it('should return false for image/gif', () => {
      expect(service.isCompressibleFormat('image/gif')).toBe(false);
    });

    it('should return false for image/png', () => {
      expect(service.isCompressibleFormat('image/png')).toBe(false);
    });

    it('should return false for image/x-png', () => {
      expect(service.isCompressibleFormat('image/x-png')).toBe(false);
    });

    it('should return true for image/jpeg', () => {
      expect(service.isCompressibleFormat('image/jpeg')).toBe(true);
    });

    it('should return true for image/webp', () => {
      expect(service.isCompressibleFormat('image/webp')).toBe(true);
    });

    it('should return true for image/jpg', () => {
      expect(service.isCompressibleFormat('image/jpg')).toBe(true);
    });
  });

  describe('compressIfNeeded', () => {
    it('should pass through SVG unchanged regardless of size', async () => {
      const buffer = Buffer.alloc(10 * 1024 * 1024); // 10MB SVG
      const result = await service.compressIfNeeded(
        buffer,
        'image/svg+xml',
        'icon.svg'
      );

      expect(result.compressed).toBe(false);
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/svg+xml');
      expect(result.fileName).toBe('icon.svg');
      expect(result.originalSize).toBe(buffer.length);
      expect(result.finalSize).toBe(buffer.length);
    });

    it('should pass through PNG unchanged regardless of size (preserve transparency)', async () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB PNG
      const result = await service.compressIfNeeded(
        buffer,
        'image/png',
        'logo.png'
      );

      expect(result.compressed).toBe(false);
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/png');
      expect(result.fileName).toBe('logo.png');
    });

    it('should optimize a small (500KB) JPEG buffer', async () => {
      const inputBuffer = Buffer.alloc(500 * 1024); // 500KB
      const outputBuffer = Buffer.alloc(300 * 1024); // 300KB compressed

      mockToBuffer.mockResolvedValue(outputBuffer);

      const result = await service.compressIfNeeded(
        inputBuffer,
        'image/jpeg',
        'photo.jpg'
      );

      expect(result.compressed).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileName).toBe('photo.jpg');
      expect(result.originalSize).toBe(500 * 1024);
      expect(result.finalSize).toBe(300 * 1024);
    });

    it('should optimize a 5MB JPEG buffer', async () => {
      const inputBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const outputBuffer = Buffer.alloc(1 * 1024 * 1024); // 1MB compressed

      mockToBuffer.mockResolvedValue(outputBuffer);

      const result = await service.compressIfNeeded(
        inputBuffer,
        'image/jpeg',
        'large-photo.jpg'
      );

      expect(result.compressed).toBe(true);
      expect(result.originalSize).toBe(5 * 1024 * 1024);
      expect(result.finalSize).toBe(1 * 1024 * 1024);
    });

    it('should apply resize when longest side exceeds 4096px', async () => {
      const inputBuffer = Buffer.from('large-image');
      const outputBuffer = Buffer.from('resized-compressed');

      mockMetadata.mockResolvedValue({ width: 8064, height: 6048 });
      mockToBuffer.mockResolvedValue(outputBuffer);

      await service.compressIfNeeded(inputBuffer, 'image/jpeg', 'huge.jpg');

      expect(mockResize).toHaveBeenCalledWith({
        width: 4096,
        height: 4096,
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should not apply resize when image is within 4096px', async () => {
      const inputBuffer = Buffer.from('normal-image');
      const outputBuffer = Buffer.from('compressed');

      mockMetadata.mockResolvedValue({ width: 2000, height: 1500 });
      mockToBuffer.mockResolvedValue(outputBuffer);

      await service.compressIfNeeded(inputBuffer, 'image/jpeg', 'normal.jpg');

      expect(mockResize).not.toHaveBeenCalled();
    });

    it('should change WebP extension to .jpg', async () => {
      const inputBuffer = Buffer.from('webp-data');
      const outputBuffer = Buffer.from('jpeg-output');

      mockToBuffer.mockResolvedValue(outputBuffer);

      const result = await service.compressIfNeeded(
        inputBuffer,
        'image/webp',
        'photo.webp'
      );

      expect(result.fileName).toBe('photo.jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should return correct originalSize and finalSize values', async () => {
      const inputBuffer = Buffer.alloc(2 * 1024 * 1024);
      const outputBuffer = Buffer.alloc(800 * 1024);

      mockToBuffer.mockResolvedValue(outputBuffer);

      const result = await service.compressIfNeeded(
        inputBuffer,
        'image/jpeg',
        'test.jpg'
      );

      expect(result.originalSize).toBe(2 * 1024 * 1024);
      expect(result.finalSize).toBe(800 * 1024);
    });

    it('should fall back to uncompressed image when sharp errors', async () => {
      const inputBuffer = Buffer.from('corrupted-data');
      mockMetadata.mockRejectedValue(new Error('Input buffer is not valid'));

      const result = await service.compressIfNeeded(
        inputBuffer,
        'image/jpeg',
        'corrupt.jpg'
      );

      expect(result.compressed).toBe(false);
      expect(result.buffer).toBe(inputBuffer);
      expect(result.originalSize).toBe(inputBuffer.length);
      expect(result.finalSize).toBe(inputBuffer.length);
    });

    it('should fall back to storing uncompressed image on compression failure', async () => {
      // First call — error, falls back to uncompressed
      mockMetadata.mockRejectedValueOnce(new Error('Sharp error'));
      const badBuffer = Buffer.from('bad');
      const result = await service.compressIfNeeded(
        badBuffer,
        'image/jpeg',
        'bad.jpg'
      );
      expect(result.compressed).toBe(false);
      expect(result.buffer).toBe(badBuffer);

      // Second call — success
      mockMetadata.mockResolvedValueOnce({ width: 1000, height: 800 });
      mockToBuffer.mockResolvedValueOnce(Buffer.from('ok'));

      const result2 = await service.compressIfNeeded(
        Buffer.from('good'),
        'image/jpeg',
        'good.jpg'
      );
      expect(result2.compressed).toBe(true);
    });
  });
});
