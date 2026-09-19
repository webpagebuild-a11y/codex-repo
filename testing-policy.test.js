import test from 'node:test';
import assert from 'node:assert/strict';
import { testingPolicy } from './testing-policy.js';
import { chooseDigest, validateSettings, emailBody } from './domain.js';
import { defaults } from './catalog.js';
const item = (tech,body,extra={}) => testingPolicy({id:body,tech,title:'Official announcement',body,published:'2026-09-19T00:00:00Z',url:'https://example.com/release',...extra});
test('focus excludes routine releases, unrelated critical news, and general AI or MCP news',()=>{
  for(const row of [item('playwright','Documentation improvements and dependency updates.'),item('node','Security patch CVE-2026-12345.'),item('mcp','Breaking changes to billing.'),item('ai','A new model benchmark record.'),item('selenium','No breaking changes.')]) assert.equal(row.important,false);
  assert.equal(item('mcp','Breaking changes to browser automation tools used in testing.').important,true);
});
test('upcoming consequential testing changes qualify without inventing a release date',()=>{
  const row=item('selenium','Upcoming release will remove support for legacy WebDriver commands.');
  assert.equal(row.important,true);assert.equal(row.upcoming,true);assert.match(emailBody([row]),/Upcoming:/);
  assert.equal(item('playwright','New test agents generate test suites.').important,true);
  assert.equal(item('playwright','Minor typo fix.',{prerelease:true}).important,false);
});
test('daily digest keeps the strict gate, excludes legacy records and respects sent IDs',()=>{
  const row=item('playwright','Security patch for browser automation.');
  const settings=validateSettings({...defaults,frequency:'daily',enabled:true,email:'test@example.com'});
  assert.equal(settings.frequency,'daily');assert.equal(settings.testingOnly,true);
  const rows=[row,item('ai','New model pricing.'),{...row,id:'legacy',policyVersion:undefined}];
  assert.deepEqual(chooseDigest(rows,settings).map(x=>x.id),[row.id]);
  assert.deepEqual(chooseDigest(rows,settings,new Set([row.id])),[]);
  assert.deepEqual(chooseDigest([item('selenium','Upcoming breaking changes to test runner.')],{...settings,includeUpcoming:false}),[]);
});
