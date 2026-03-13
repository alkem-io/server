import { StorageDisabledException } from '@common/exceptions/storage/storage.disabled.exception';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { vi } from 'vitest';
import { StorageServiceType } from '../storage.service.type';
import { LocalStorageAdapter } from './local.storage.adapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let testStoragePath: string;

  const createAdapter = async (enabled = true) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'storage.enabled') return enabled;
              if (key === 'storage.local_storage.path') return testStoragePath;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    return module.get<LocalStorageAdapter>(LocalStorageAdapter);
  };

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testStoragePath = fs.mkdtempSync(path.join(os.tmpdir(), 'alkemio-test-'));
    adapter = await createAdapter(true);
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getType', () => {
    it('should return LOCAL_STORAGE', () => {
      expect(adapter.getType()).toBe(StorageServiceType.LOCAL_STORAGE);
    });
  });

  describe('when storage is disabled', () => {
    let disabledAdapter: LocalStorageAdapter;

    beforeEach(async () => {
      disabledAdapter = await createAdapter(false);
    });

    it('should throw StorageDisabledException on save', () => {
      expect(() => disabledAdapter.save(Buffer.from('test'))).toThrow(
        StorageDisabledException
      );
    });

    it('should throw StorageDisabledException on read', async () => {
      await expect(disabledAdapter.read('test.txt')).rejects.toThrow(
        StorageDisabledException
      );
    });

    it('should throw StorageDisabledException on delete', async () => {
      await expect(disabledAdapter.delete('test.txt')).rejects.toThrow(
        StorageDisabledException
      );
    });

    it('should throw StorageDisabledException on exists', () => {
      expect(() => disabledAdapter.exists('test.txt')).toThrow(
        StorageDisabledException
      );
    });
  });

  describe('when storage is enabled', () => {
    it('should save a buffer and return filename', async () => {
      const result = await adapter.save(Buffer.from('test data'));

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Verify the file was actually written
      expect(fs.existsSync(path.join(testStoragePath, result))).toBe(true);
    });

    it('should return existing filename when file already exists', async () => {
      const data = Buffer.from('test data for dedup');
      // Save once
      const firstResult = await adapter.save(data);
      // Save again with same data - should return same filename
      const secondResult = await adapter.save(data);

      expect(firstResult).toBe(secondResult);
    });

    it('should read a file', async () => {
      // First save a file, then read it back
      const testData = Buffer.from('test-content-for-read');
      const fileName = await adapter.save(testData);

      const result = await adapter.read(fileName);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('test-content-for-read');
    });

    it('should delete a file', async () => {
      // First save a file, then delete it
      const testData = Buffer.from('test-content-for-delete');
      const fileName = await adapter.save(testData);
      expect(adapter.exists(fileName)).toBe(true);

      await adapter.delete(fileName);

      expect(adapter.exists(fileName)).toBe(false);
    });

    it('should check file existence', async () => {
      const testData = Buffer.from('test-content-for-exists');
      const fileName = await adapter.save(testData);

      const result = adapter.exists(fileName);

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const result = adapter.exists('non-existent-file');

      expect(result).toBe(false);
    });

    it('should throw on read of non-existent file', async () => {
      await expect(adapter.read('non-existent-file')).rejects.toThrow();
    });

    it('should throw on delete of non-existent file', async () => {
      await expect(adapter.delete('non-existent-file')).rejects.toThrow();
    });
  });
});
