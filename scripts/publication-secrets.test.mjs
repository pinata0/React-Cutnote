import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {secretFindings, labelledCredentials} from './publication-secrets.mjs';

test('finds a known value even without a credential label and never reports it', () => {
  const value=randomUUID(), findings=secretFindings('ordinary prose '+value,new Set([value]));
  assert(findings.includes('known-value copy'));
  assert(!JSON.stringify(findings).includes(value));
});
test('detects document credentials in metadata, bold text, tables and separate lines', () => {
  for(const label of ['team_identifier: "','**비밀번호**: ','| 팀 접근 코드 | ','## Password\n\n']) {
    const value=randomUUID(),text=label+value;
    assert.equal(labelledCredentials(text)[0]?.value,value);
    assert(secretFindings(text,new Set()).some(f=>f.startsWith('credential label')));
  }
});
test('allows placeholders, environment lookups and lists of variable names', () => {
  for(const text of ['team_identifier: "[REDACTED_ACCESS_CODE]"','password: <PLACEHOLDER>','password: process.env.PASSWORD','OPENAI_API_KEY\nGEMINI_API_KEY']) {
    assert.equal(labelledCredentials(text).length,0);
  }
});
test('API key patterns are repeatable without saving literal keys', () => {
  const key=['AIza','A'.repeat(35)].join('');
  for(let i=0;i<2;i++)assert(secretFindings(key,new Set()).includes('credential pattern'));
});
