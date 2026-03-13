import 'reflect-metadata';
import { copyMetadata } from './copy.metadata';

describe('copyMetadata', () => {
  it('should copy all metadata keys from source to destination', () => {
    const src = () => {};
    const dest = () => {};

    Reflect.defineMetadata('key1', 'value1', src);
    Reflect.defineMetadata('key2', 42, src);

    copyMetadata(src, dest);

    expect(Reflect.getMetadata('key1', dest)).toBe('value1');
    expect(Reflect.getMetadata('key2', dest)).toBe(42);
  });

  it('should handle source with no metadata', () => {
    const src = () => {};
    const dest = () => {};

    copyMetadata(src, dest);

    expect(Reflect.getMetadataKeys(dest)).toEqual([]);
  });

  it('should overwrite existing metadata on destination', () => {
    const src = () => {};
    const dest = () => {};

    Reflect.defineMetadata('key1', 'original', dest);
    Reflect.defineMetadata('key1', 'updated', src);

    copyMetadata(src, dest);

    expect(Reflect.getMetadata('key1', dest)).toBe('updated');
  });
});
