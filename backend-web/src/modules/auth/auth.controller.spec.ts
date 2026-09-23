describe('AuthController test cases', () => {
  describe('register', () => {
    it.todo('registers a valid user and returns only public user/session data');
    it.todo('sets access and refresh cookies after successful registration');
    it.todo('reuses a valid signed device id from the request');
    it.todo('creates and signs a new device id when the cookie is missing');
    it.todo('does not set auth cookies when registration fails');
    it.todo('does not expose access or refresh tokens in the response body');
  });

  describe('login', () => {
    it.todo('returns public user/session data for valid credentials');
    it.todo('sets access and refresh cookies after successful login');
    it.todo('does not set auth cookies when credentials are rejected');
    it.todo('records bounded user-agent, IP address and detected device name');
  });

  describe('refresh', () => {
    it.todo('rejects a request without a refresh cookie');
    it.todo('rotates both cookies for a valid refresh token');
    it.todo('does not expose rotated tokens in the response body');
    it.todo('does not replace cookies when refresh validation fails');
  });

  describe('logout and password', () => {
    it.todo('passes the authenticated session context to logout');
    it.todo('clears both auth cookies after logout');
    it.todo('revokes all sessions and clears cookies on logout-all');
    it.todo('changes password with the authenticated user context');
    it.todo('clears auth cookies only after password change succeeds');
  });

  describe('session management', () => {
    it.todo('lists sessions only for the authenticated user');
    it.todo('validates session id as UUID before revocation');
    it.todo('passes both user context and target session id to revocation');
  });
});
