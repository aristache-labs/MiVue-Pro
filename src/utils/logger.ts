export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  error(message: string): void;
}

export function createLogger(debugEnabled = false): Logger {
  return {
    debug(message: string): void {
      if (debugEnabled) {
        process.stderr.write(`[debug] ${message}\n`);
      }
    },
    info(message: string): void {
      process.stdout.write(`${message}\n`);
    },
    error(message: string): void {
      process.stderr.write(`${message}\n`);
    },
  };
}
