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
    ext => ext.$type === 'zeebe:CalledElement'
  );

  return zeebeCalledElement ? safeGet(zeebeCalledElement, 'processId') || null : null;
}

export function getCalledProcessId(element) {
  if (!element) return null;
  const businessObject = element.businessObject || element;

  // Camunda 8
  const zeebeProcessId = getZeebeProcessId(businessObject);
  if (zeebeProcessId) return zeebeProcessId;

  // Camunda 7
  return safeGet(businessObject, 'calledElement') || null;
}

export function isCallActivity(element) {
  return element?.type === 'bpmn:CallActivity';
}
