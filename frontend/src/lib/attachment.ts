/**
 * Attachments are persisted as base64 `data:` URLs. Browsers block top-level
 * navigation to `data:` URLs, so they must be re-wrapped as `blob:` object URLs
 * before they can be opened in a tab or handed to a download anchor.
 */

const dataUrlToBlob = (dataUrl: string): Blob => {
    const [meta, base64 = ''] = dataUrl.split(',');
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
};

const withUsableUrl = (attachmentUrl: string, consume: (url: string) => void): boolean => {
    try {
        const isData = attachmentUrl.startsWith('data:');
        const url = isData ? URL.createObjectURL(dataUrlToBlob(attachmentUrl)) : attachmentUrl;
        consume(url);
        if (isData) setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch {
        return false;
    }
};

/**
 * Opens the attachment in a new tab. Returns false when the file could not be
 * decoded or the browser blocked the pop-up.
 */
export function openAttachment(attachmentUrl?: string | null): boolean {
    if (!attachmentUrl) return false;
    let opened = false;
    const decoded = withUsableUrl(attachmentUrl, (url) => {
        opened = Boolean(window.open(url, '_blank', 'noopener,noreferrer'));
    });
    return decoded && opened;
}

/**
 * Saves the attachment to disk. Returns false when the file could not be decoded.
 */
export function downloadAttachment(attachmentUrl?: string | null, fileName?: string | null): boolean {
    if (!attachmentUrl) return false;
    return withUsableUrl(attachmentUrl, (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        link.remove();
    });
}
