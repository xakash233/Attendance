export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = (rotation * Math.PI) / 180;

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * This function handles cropping and rotation of images.
 * It uses a bounding box approach to ensure that rotation doesn't clip the image
 * and then extracts the precise crop area provided by react-easy-crop.
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return '';
    }

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bWidth, height: bHeight } = rotateSize(image.width, image.height, rotation);

    // Set canvas dimensions to the bounding box of the rotated image
    canvas.width = bWidth;
    canvas.height = bHeight;

    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, bWidth, bHeight);

    // translate canvas context to a central point to allow rotating around its center.
    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    // now create a new canvas for the final desired crop size
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');

    if (!cropCtx) {
        return '';
    }

    cropCanvas.width = pixelCrop.width;
    cropCanvas.height = pixelCrop.height;

    // Fill white background for the final crop canvas as well
    cropCtx.fillStyle = '#ffffff';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

    // Paste generated rotate image with correct offsets for x,y crop values.
    cropCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Return as Base64 string for direct preview and upload
    return cropCanvas.toDataURL('image/jpeg', 0.95);
}
