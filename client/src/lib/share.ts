export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareCurrentPage(title: string): Promise<ShareResult> {
  if (typeof window === 'undefined') return 'failed';
  const url = window.location.href;

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
