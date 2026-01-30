export function extractProcessIds(content) {
  const processIds = [];
  const regex = /<bpmn2?:process[^>]+id="([^"]+)"/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    processIds.push(match[1]);
  }

  return processIds;
}
