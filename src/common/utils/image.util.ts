import sizeOf from 'image-size';

export async function getImageSize(imageBuffer: Buffer): Promise<any> {
  const imageSize = sizeOf(imageBuffer);
  const imageHeight = imageSize.height as number;
  const imageWidth = imageSize.width as number;
  return { imageHeight, imageWidth };
}

export async function validateImageDimensions(
  imageBuffer: Buffer,
  minSize: number,
  maxSize: number
): Promise<boolean> {
  const { imageHeight, imageWidth } = await getImageSize(imageBuffer);

  if (
    imageHeight < minSize ||
    imageHeight > maxSize ||
    imageWidth < minSize ||
    imageWidth > maxSize
  )
    return false;
  return true;
}
