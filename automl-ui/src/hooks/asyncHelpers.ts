import type { UseAsyncOperationResult } from './useAsyncOperation'

type AsyncOp = Pick<UseAsyncOperationResult<unknown[], unknown>, 'loading' | 'error' | 'reset'>

export function aggregateAsyncState(operations: AsyncOp[]): { loading: boolean; error: string | null } {
  return {
    loading: operations.some((op) => op.loading),
    error: operations.map((op) => op.error).find((err): err is string => err !== null) ?? null,
  }
}

export function resetAsyncOperations(operations: AsyncOp[]): void {
  operations.forEach((op) => op.reset())
}

export async function orNull<T>(promise: Promise<T | undefined>): Promise<T | null> {
  const result = await promise
  return result ?? null
}

export async function orArray<T>(promise: Promise<T[] | undefined>): Promise<T[]> {
  const result = await promise
  return result ?? []
}

export async function orFalse(promise: Promise<boolean | undefined>): Promise<boolean> {
  const result = await promise
  return result ?? false
}
