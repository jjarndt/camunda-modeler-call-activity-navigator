function safeGet(obj, prop) {
  if (typeof obj?.get === 'function') return obj.get(prop);
  return obj?.[prop] ?? null;
}

function getZeebeProcessId(businessObject) {
  const extensionElements = safeGet(businessObject, 'extensionElements');
  if (!extensionElements) return null;

  const values = safeGet(extensionElements, 'values') || [];
  if (!Array.isArray(values)) return null;

  const zeebeCalledElement = values.find(
    ext => ext?.$type === 'zeebe:CalledElement'
  );

  if (!zeebeCalledElement) return null;
  const processId = safeGet(zeebeCalledElement, 'processId') || null;
  return processId && processId.trim() ? processId.trim() : null;
}

export function getCalledProcessId(element) {
  if (!element) return null;
  const businessObject = element.businessObject || element;

  // Camunda 8
  const zeebeProcessId = getZeebeProcessId(businessObject);
  if (zeebeProcessId) return zeebeProcessId;

  // Camunda 7
  const calledElement = safeGet(businessObject, 'calledElement') || null;
  return calledElement && calledElement.trim() ? calledElement.trim() : null;
}

export function isCallActivity(element) {
  return element?.type === 'bpmn:CallActivity' || element?.$type === 'bpmn:CallActivity';
}
