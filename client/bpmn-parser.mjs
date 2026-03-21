export function extractProcessIds(content) {
  if (!content || typeof content !== 'string') return [];

  const matches = content.matchAll(/<bpmn2?:process[^>]+id="([^"]+)"/g);

  return Array.from(matches, (m) => m[1]);
}
