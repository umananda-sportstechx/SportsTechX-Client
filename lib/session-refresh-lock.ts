'use client';

// Prevents concurrent token refreshes — mirrors legacy sessionRefreshLock.ts
class SessionRefreshLock {
  private _pending: Promise<unknown> | null = null;

  async acquireAndRefresh<T>(fn: () => Promise<T>): Promise<T> {
    if (this._pending) {
      return this._pending as Promise<T>;
    }
    this._pending = fn().finally(() => {
      this._pending = null;
    });
    return this._pending as Promise<T>;
  }
}

export const sessionRefreshLock = new SessionRefreshLock();
