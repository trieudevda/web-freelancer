describe('UserController test cases', () => {
  describe('GET /user/me', () => {
    it.todo('requires a valid authenticated session');
    it.todo('loads the user id only from authenticated context');
    it.todo('returns a public user without password or auth version');
    it.todo('returns not found when the authenticated user was deleted');
  });

  describe('PATCH /user/me', () => {
    it.todo('requires a valid authenticated session');
    it.todo('passes authenticated user id and validated DTO to the service');
    it.todo('returns only the updated public user fields');
    it.todo('does not allow email, role, status or password mass assignment');
    it.todo(
      'propagates optimistic locking conflicts without retrying silently',
    );
  });
});
