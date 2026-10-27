import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkflow } from '../src/engine.js';

test('qualified lead reaches the solutions team', () => {
  const run = runWorkflow('lead', { company: 'Aster', budget: 4000, volume: 150, timeline: 20 });
  assert.equal(run.decision, 'Book discovery call');
  assert.equal(run.metric, '100/100');
  assert.equal(run.owner, 'Solutions team');
});

test('low-information lead stays in intake', () => {
  const run = runWorkflow('lead', { company: 'Aster', budget: 100, volume: 12, timeline: 120 });
  assert.equal(run.decision, 'Request more detail');
  assert.equal(run.metric, '20/100');
});

test('outage overrides billing route', () => {
  const run = runWorkflow('support', { customer: 'Aster', tier: 'Standard', subject: 'Checkout is down', message: 'Payment stopped' });
  assert.equal(run.decision, 'Critical priority');
  assert.equal(run.owner, 'Incident response');
});

test('invoice exceptions are held for a human', () => {
  const run = runWorkflow('invoice', { vendor: 'Acme', invoiceNo: '1', amount: 7000, poMatched: 'No', duplicate: 'Yes' });
  assert.equal(run.metric, '3');
  assert.equal(run.decision, 'Hold for review');
  assert.equal(run.requiresApproval, true);
});

test('clean invoice still requires final approval', () => {
  const run = runWorkflow('invoice', { vendor: 'Acme', invoiceNo: '2', amount: 300, poMatched: 'Yes', duplicate: 'No' });
  assert.equal(run.metric, '0');
  assert.equal(run.decision, 'Ready for approval');
  assert.equal(run.requiresApproval, true);
});
