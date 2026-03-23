function safeGet(obj, prop) {
  if (typeof obj?.get === 'function') return obj.get(prop);
  return obj?.[prop] ?? null;
}

function getZeebeProcessId(businessObject) {
  const extensionElements = safeGet(businessObject, 'extensionElements');
  if (!extensionElements) return { found: false, id: null };

  const values = safeGet(extensionElements, 'values') || [];
  if (!Array.isArray(values)) return { found: false, id: null };

  const zeebeCalledElement = values.find(
    ext => ext?.$type === 'zeebe:CalledElement'
  );

  if (!zeebeCalledElement) return { found: false, id: null };
  const processId = safeGet(zeebeCalledElement, 'processId') || null;
  const id = typeof processId === 'string' && processId.trim() ? processId.trim() : null;
  return { found: true, id };
}

export function getCalledProcessId(element) {
  if (!element) return null;
  try {
    const businessObject = element.businessObject || element;

    // Camunda 8
    const zeebe = getZeebeProcessId(businessObject);
    if (zeebe.found) return zeebe.id;

    // Camunda 7
    const calledElement = safeGet(businessObject, 'calledElement') || null;
    return typeof calledElement === 'string' && calledElement.trim() ? calledElement.trim() : null;
  } catch {
    return null;
  }
}

export function isCallActivity(element) {
  return element?.type === 'bpmn:CallActivity' || element?.$type === 'bpmn:CallActivity';
}
