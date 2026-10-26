export function stringifyWithoutAuthorizationMetaInfo(object: any): string {
  return JSON.stringify(object, (key, value) => {
    if (
      key === 'credentials' ||
      key === 'authorization' ||
      key === 'createdDate' ||
      key === 'updatedDate' ||
      key === 'version' ||
      key === 'allowedTypes' ||
      key === 'storageBucket' ||
      key === 'visuals' ||
      key === 'issuer' ||
      key === 'expires' ||
      // workspace#091: the minted Matrix access token. `logResponsePayload`
      // runs every adapter response through here at verbose level.
      key === 'access_token'
    ) {
      return undefined;
    }
    return value;
  });
}
