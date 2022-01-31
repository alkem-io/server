import sizeOf from 'image-size';

export async function getImageSize(imageBuffer: Buffer): Promise<any> {
  const imageSize = sizeOf(imageBuffer);
  const imageHeight = imageSize.height as number;
  const imageWidth = imageSize.width as number;
  return { imageHeight, imageWidth };
}
