export function stringifyWithoutAuthorizationMetaInfo(object: any): string {
  return JSON.stringify(object, (key, value) => {
    if (
      key === 'authorization' ||
      key === 'createdDate' ||
      key === 'updatedDate' ||
      key === 'version' ||
      key === 'allowedTypes' ||
      key === 'storageBucket' ||
      key === 'visuals' ||
      key === 'issuer' ||
      key === 'expires'
    ) {
      return undefined;
    }
    return value;
  });
}
