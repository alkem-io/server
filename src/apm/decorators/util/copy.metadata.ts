import 'reflect-metadata';

/**
 * Copies all metadata from one object to another.
 * Useful for overwriting function definition in
 * decorators while keeping all previously
 * attached metadata
 *
 * @param src object to copy metadata from
 * @param dest object to copy metadata to1
 */
export function copyMetadata(src: any, dest: any) {
  const metadataKeys = Reflect.getMetadataKeys(src);
  metadataKeys.map(key => {
    const value = Reflect.getMetadata(key, src);
    Reflect.defineMetadata(key, value, dest);
  });
}
