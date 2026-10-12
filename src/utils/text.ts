export function tidyText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function formatSyncTime(iso: string | null | undefined): string {
  if (!iso) return 'Not synchronized yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not synchronized yet';
  return date.toLocaleString();
}
