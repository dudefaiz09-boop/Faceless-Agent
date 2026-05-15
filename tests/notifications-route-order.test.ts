import notificationsRouter from '../apps/functions/src/routes/notifications.ts';

function findPatchRouteIndex(path: string) {
  // Express exposes route metadata via router.stack layers.
  // This is stable enough for a regression test on route ordering.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stack = (notificationsRouter as any).stack as any[];
  return stack.findIndex(
    (layer) => layer?.route?.path === path && layer?.route?.methods?.patch === true
  );
}

describe('Notifications Router Route Order', () => {
  it('registers PATCH /read-all before PATCH /:id/read', () => {
    const readAllIndex = findPatchRouteIndex('/read-all');
    const readOneIndex = findPatchRouteIndex('/:id/read');

    expect(readAllIndex).toBeGreaterThanOrEqual(0);
    expect(readOneIndex).toBeGreaterThanOrEqual(0);
    expect(readAllIndex).toBeLessThan(readOneIndex);
  });
});
