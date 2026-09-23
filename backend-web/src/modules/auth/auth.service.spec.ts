describe('AuthService test cases', () => {
  describe('register', () => {
    it.todo('hashes the password before creating a user');
    it.todo('normalizes user data through UserService');
    it.todo('creates the user and login session in one transaction');
    it.todo('rolls back the user when session creation fails');
    it.todo('never returns password or token hashes');
  });

  describe('credential validation', () => {
    it.todo('accepts the correct password for an active user');
    it.todo(
      'returns the same unauthorized error for unknown email and wrong password',
    );
    it.todo('rejects inactive, pending, suspended and banned users');
    it.todo('does not expose whether an email exists');
    it.todo('handles a malformed stored password hash without crashing');
  });

  describe('login session', () => {
    it.todo('revokes an existing active session for the same user and device');
    it.todo('does not revoke sessions belonging to another user');
    it.todo('creates independent sessions for different device ids');
    it.todo(
      'truncates device name, user-agent and IP values to database limits',
    );
    it.todo('uses a generated device id when the supplied value is blank');
    it.todo('stores token hashes and never stores plaintext tokens');
    it.todo('sets access and absolute refresh expiration correctly');
  });

  describe('refresh rotation', () => {
    it.todo('rejects malformed refresh tokens');
    it.todo('locks the session row while rotating tokens');
    it.todo('rejects missing, revoked and expired sessions');
    it.todo('rejects an incorrect refresh secret');
    it.todo('rejects users that are missing or no longer active');
    it.todo('rejects a session with an outdated auth version');
    it.todo('rotates access and refresh hashes atomically');
    it.todo('preserves the original absolute refresh expiry');
    it.todo(
      'allows only one concurrent request to reuse the same refresh token',
    );
  });

  describe('logout and password change', () => {
    it.todo('revokes only the current user session during logout');
    it.todo('returns revoked false when logout is repeated');
    it.todo(
      'increments auth version and revokes all active sessions atomically',
    );
    it.todo('rejects a new password equal to the current password');
    it.todo('rejects an incorrect current password without changing data');
    it.todo('hashes the new password and revokes every session atomically');
    it.todo('rolls back password and session changes when persistence fails');
  });

  describe('session listing and revocation', () => {
    it.todo('returns only non-revoked sessions for the authenticated user');
    it.todo('marks exactly one session as current');
    it.todo('does not expose access or refresh token hashes');
    it.todo('cannot revoke another user session');
    it.todo('returns not found for missing or already revoked sessions');
  });
});
