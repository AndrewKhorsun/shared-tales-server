interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
  onRetry?: (attempt: number, err: unknown) => void;
}

function isOverloaded(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.message.includes("overloaded") ||
      err.message.includes("529") ||
      err.message.includes("overloaded_error")
    );
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelayMs = 2000,
    shouldRetry = isOverloaded,
    onRetry,
  } = options;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      onRetry?.(attempt, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastErr;
}
