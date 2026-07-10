const MAX_DIMENSION = 512;

export async function compressProfileImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Unable to process image.');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (result) => {
                if (!result) {
                    reject(new Error('Unable to compress image.'));
                    return;
                }
                resolve(result);
            },
            'image/jpeg',
            0.85
        );
    });

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }
            reject(new Error('Unable to read image file.'));
        };
        reader.onerror = () => reject(new Error('Unable to read image file.'));
        reader.readAsDataURL(file);
    });
}
