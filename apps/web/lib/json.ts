/** Narrow untrusted JSON before reading fields; missing objects/arrays stay empty. */
export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
export function responseText(value: unknown, provider: 'openai' | 'gemini'): string {
  const data = object(value);
  if (provider === 'gemini') {
    const candidate = object(array(data.candidates)[0]);
    if (candidate.finishReason !== 'STOP') throw new Error('AI 응답을 끝까지 받지 못했어요. 다시 시도해주세요.');
    return array(object(candidate.content).parts).map(object)
      .filter(part => typeof part.text === 'string' && !part.thought).map(part => part.text).join('');
  }
  if (data.status !== 'completed' || !Array.isArray(data.output)) throw new Error('AI 응답을 끝까지 받지 못했어요. 다시 시도해주세요.');
  return data.output.map(object).filter(output => output.type === 'message')
    .flatMap(output => array(output.content)).map(object)
    .filter(part => part.type === 'output_text' && typeof part.text === 'string').map(part => part.text).join('');
}
