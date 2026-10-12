export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  return fallback;
}
