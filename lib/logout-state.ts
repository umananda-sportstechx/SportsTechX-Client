'use client';

// Cross-tab logout coordination — mirrors legacy logoutState.ts
// Uses localStorage events to broadcast logout across tabs

const LOGOUT_KEY = 'stx_logging_out';
const SESSION_KEY = 'stx_session_valid';

class LogoutState {
  private _loggingOut = false;
  private _hasValidSession = false;

  isLoggingOut() {
    return this._loggingOut;
  }

  hasValidSession() {
    return this._hasValidSession;
  }

  setLoggingOut(value: boolean) {
    this._loggingOut = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOGOUT_KEY, String(value));
    }
  }

  setSessionValid(value: boolean) {
    this._hasValidSession = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, String(value));
    }
  }

  startLogout() {
    this._loggingOut = true;
    this._hasValidSession = false;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOGOUT_KEY, 'true');
      localStorage.setItem(SESSION_KEY, 'false');
    }
  }
}

export const logoutState = new LogoutState();
