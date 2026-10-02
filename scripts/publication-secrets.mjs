import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const keyPatterns = [
  /AIza[0-9A-Za-z_-]{35}/g,
  /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g,
  /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
];
export function labelledCredentials(text) {
  const label = '(?:team_identifier|team[_ -]?(?:access[_ -]?)?code|팀\\s*(?:접근\\s*)?코드|비밀번호|password|[A-Z_]*(?:API_KEY|SECRET|TOKEN))';
  const inline = new RegExp(label + '["\']?\\s*[:=|]\\s*["\'`]?([^\\s"\'`|]+)', 'i');
  const heading = /^\s*(?:#+\s*)?(?:team_identifier|team[_ -]?(?:access[_ -]?)?code|팀\s*(?:접근\s*)?코드|비밀번호|password)\s*[:：]?\s*$/i;
  const lines = text.split(/\r?\n/).map(line => line.replace(/\*\*/g, ''));
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    const match = inline.exec(lines[i]);
    let value = match?.[1];
    if (!value && heading.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      value = /^["'`]?([A-Za-z0-9][A-Za-z0-9!@#$%_.-]{3,})["'`]?\s*$/.exec(lines[j] || '')?.[1];
    }
    if (value && value.length >= 4 && !/^(?:\[|<|process\.|os\.|undefined|null|자리표시자)/.test(value)) results.push({line:i+1,value});
  }
  return results;
}
// Values are loaded only into memory. Never serialize this set, even as hashes.
export function knownSecrets(root) {
  const values = new Set();
  const sources = [
    'legacy/초기 아이디어 기획서.md',
    'docs/사전 멘토링 및 참가자 허브 이용 안내.md',
    'main/outputs/cutnote/.dev.vars',
    'main/work/youtube-probe/public-search.html',
  ];
  for (const path of sources) {
    if (!existsSync(resolve(root, path))) continue;
    const text = readFileSync(resolve(root, path), 'utf8');
    for (const pattern of keyPatterns) for (const match of text.matchAll(pattern)) values.add(match[0]);
    for (const {value} of labelledCredentials(text)) values.add(value);
  }
  return values;
}

export function secretFindings(text, values) {
  const found = [];
  if ([...values].some(value => text.includes(value))) found.push('known-value copy');
  if (keyPatterns.some(pattern => { pattern.lastIndex = 0; return pattern.test(text); })) found.push('credential pattern');
  // Documentation credentials are not necessarily API keys. Report line numbers only.
  for (const {line} of labelledCredentials(text)) found.push('credential label at line ' + line);
  return found;
}
