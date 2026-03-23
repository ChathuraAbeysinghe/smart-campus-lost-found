import sharp from 'sharp';

export const computeImageHash = async (buffer) => {
  const pixels = await sharp(buffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  const avg = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;

  return Array.from(pixels)
    .map((pixel) => (pixel >= avg ? '1' : '0'))
    .join('');
};

export const imageHashSimilarity = (hashA, hashB) => {
  if (!hashA || !hashB || hashA.length !== hashB.length) {
    return 0;
  }

  let sameBits = 0;

  for (let index = 0; index < hashA.length; index += 1) {
    if (hashA[index] === hashB[index]) {
      sameBits += 1;
    }
  }

  return sameBits / hashA.length;
};
