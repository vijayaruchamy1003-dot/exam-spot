export function logInfo(event: string): void {
  if (__DEV__) {
    console.info(`[exam-room-finder] ${event}`);
  }
}
