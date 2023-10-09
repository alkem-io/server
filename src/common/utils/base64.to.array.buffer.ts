export const base64ToArrayBuffer = (base64: string) => {
  return Buffer.from(base64, 'base64');
};
