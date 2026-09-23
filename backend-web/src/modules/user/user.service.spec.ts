describe('UserService test cases', () => {
  describe('createForAuth', () => {
    it.todo('trims names, phone and address and lowercases email');
    it.todo('rejects an email already present after normalization');
    it.todo('maps a concurrent unique-key violation to ConflictException');
    it.todo('rethrows database errors unrelated to duplicate email');
    it.todo('sets active status and initial auth version');
    it.todo(
      'uses the transaction repository when an EntityManager is supplied',
    );
    it.todo('never stores a plaintext password supplied outside passwordHash');
  });

  describe('queries', () => {
    it.todo('finds email case-insensitively and explicitly selects password');
    it.todo('excludes soft-deleted users when authenticating');
    it.todo('locks the user row when loading password for an update');
    it.todo('returns not found for a missing or soft-deleted user id');
  });

  describe('profile update', () => {
    it.todo('trims every supplied editable profile field');
    it.todo('updates only fields explicitly supplied by the client');
    it.todo('increments version exactly once after a successful update');
    it.todo('does not update when client version is stale');
    it.todo('distinguishes a missing user from a version conflict');
    it.todo('does not update a soft-deleted user');
    it.todo(
      'returns current data without issuing update when no field changes',
    );
    it.todo('does not allow email, password, status or auth version changes');
  });

  describe('public projection', () => {
    it.todo('includes only documented public user fields');
    it.todo('never exposes password, auth version or deletedAt');
  });
});
