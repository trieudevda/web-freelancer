describe('MediaController test cases', () => {
  describe('upload', () => {
    it.todo('rejects a request when no file is supplied');
    it.todo('passes the validated file and metadata DTO to the service');
    it.todo('supports at most twenty files in a bulk upload');
    it.todo('rejects an empty bulk upload');
    it.todo('does not call the service when interceptor validation fails');
  });

  describe('read and search', () => {
    it.todo('validates media id as UUID');
    it.todo('passes validated query filters and pagination to the service');
    it.todo('sets safe content type and disposition headers');
    it.todo('streams only an active media file returned by the service');
    it.todo('propagates a missing physical file as a controlled response');
  });

  describe('update and lifecycle', () => {
    it.todo('passes the replacement file and target UUID to the service');
    it.todo('updates only title and alt text');
    it.todo('requests deletion without immediately deleting the file');
    it.todo('restores a recoverable pending-delete record');
  });

  describe('authorization requirements', () => {
    it.todo('rejects unauthenticated uploads');
    it.todo('rejects users without media management permission');
    it.todo('allows an authorized administrator to mutate media');
  });
});
