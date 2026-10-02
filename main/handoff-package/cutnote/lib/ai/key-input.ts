type Provider = 'openai' | 'gemini';

// Accept common copy/paste wrappers without changing characters inside a key.
export function normalizeKeyInput(input: unknown, provider: Provider): string | null {
 if (typeof input !== 'string' || input.length > 1024) return null;
 let value = input.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
 if (/[\r\n]/.test(value)) return null;
 const assignment = /^(?:export\s+)?([A-Z_]+)\s*=\s*(.*)$/.exec(value);
 if (assignment) {
  const allowed = provider === 'openai' ? ['OPENAI_API_KEY'] : ['GEMINI_API_KEY', 'GOOGLE_API_KEY'];
  if (!allowed.includes(assignment[1])) return null;
  value = assignment[2].trim();
 }
 if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1).trim();
 return /^[A-Za-z0-9_-]{20,512}$/.test(value) ? value : null;
}
