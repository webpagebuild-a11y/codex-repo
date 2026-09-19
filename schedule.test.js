import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyDue } from './schedule.js';
test('daily delivery is 8 AM ET in both summer and winter', () => {
  assert.equal(dailyDue(null,Date.parse('2026-07-10T11:59:00Z')),false);
  assert.equal(dailyDue(null,Date.parse('2026-07-10T12:00:00Z')),true);
  assert.equal(dailyDue(null,Date.parse('2026-01-10T12:59:00Z')),false);
  assert.equal(dailyDue(null,Date.parse('2026-01-10T13:00:00Z')),true);
});
test('DST transitions preserve 8 AM calendar time without duplicate sends', () => {
  assert.equal(dailyDue('2026-03-07T13:00:00Z',Date.parse('2026-03-08T12:00:00Z')),true);
  assert.equal(dailyDue('2026-10-31T12:00:00Z',Date.parse('2026-11-01T13:00:00Z')),true);
  assert.equal(dailyDue('2026-03-08T12:00:00Z',Date.parse('2026-03-08T12:30:00Z')),false);
});
test('retries are allowed within an hour; afternoon catch-up is suppressed', () => {
  assert.equal(dailyDue(null,Date.parse('2026-07-10T12:59:00Z')),true);
  assert.equal(dailyDue(null,Date.parse('2026-07-10T13:00:00Z')),false);
  assert.equal(dailyDue(null,Date.parse('2026-07-10T20:00:00Z')),false);
  assert.throws(()=>dailyDue(null,Date.now(),'99:00'));
});
