export class SearchLandingTimeoutError extends Error {
  constructor(
    public readonly label: string,
    public readonly budgetMs: number
  ) {
    super(`${label} exceeded ${budgetMs}ms`);
    this.name = "SearchLandingTimeoutError";
  }
}

/**
 * Rejects with {@link SearchLandingTimeoutError} if `promise` does not settle within `budgetMs`.
 * Does not cancel underlying I/O.
 */
export function raceWithTimeout<T>(promise: Promise<T>, budgetMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new SearchLandingTimeoutError(label, budgetMs));
    }, budgetMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
