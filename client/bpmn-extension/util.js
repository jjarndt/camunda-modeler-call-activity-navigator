function getZeebeProcessId(businessObject) {
  const extensionElements = businessObject.get('extensionElements');
  if (!extensionElements) return null;

  const values = extensionElements.get('values') || [];
  const zeebeCalledElement = values.find(
    ext => ext.$type === 'zeebe:CalledElement'
  );

  return zeebeCalledElement ? zeebeCalledElement.get('processId') || null : null;
}

export function getCalledProcessId(element) {
  const businessObject = element.businessObject || element;

  // Camunda 8
  const zeebeProcessId = getZeebeProcessId(businessObject);
  if (zeebeProcessId) return zeebeProcessId;

  // Camunda 7
  return businessObject.get('calledElement') || null;
}

export function isCallActivity(element) {
  return element.type === 'bpmn:CallActivity';
}
