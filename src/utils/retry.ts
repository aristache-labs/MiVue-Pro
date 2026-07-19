export interface RetryOptions {
  readonly attempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly signal?: AbortSignal;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function retry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  if (!Number.isInteger(options.attempts) || options.attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    options.signal?.throwIfAborted();
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < options.attempts && (options.shouldRetry?.(error, attempt) ?? true);
      if (!canRetry) {
        throw error;
      }

      const delayMs = Math.min(options.maxDelayMs, options.initialDelayMs * 2 ** (attempt - 1));
      await abortableDelay(delayMs, options.signal);
    }
  }

  throw lastError;
}

async function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    if (signal === undefined) {
      setTimeout(resolve, delayMs);
      return;
    }

    const abort = (): void => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      reject(signal.reason instanceof Error ? signal.reason : new Error("Operation aborted"));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    signal.addEventListener("abort", abort, { once: true });
  });
}
