/**
 * Get the called process ID from a Call Activity element.
 * Supports both Camunda 8 (Zeebe) and Camunda 7 (Platform).
 *
 * @param {Object} element - The bpmn-js element
 * @returns {string|null} The process ID or null if not found
 */
export function getCalledProcessId(element) {
  const businessObject = element.businessObject || element;

  // Camunda 8: zeebe:CalledElement extension
  const extensionElements = businessObject.get('extensionElements');
  if (extensionElements) {
    const values = extensionElements.get('values') || [];
    const calledElement = values.find(
      ext => ext.$type === 'zeebe:CalledElement'
    );
    if (calledElement) {
      return calledElement.get('processId') || null;
    }
  }

  // Camunda 7: calledElement attribute
  const calledElement = businessObject.get('calledElement');
  if (calledElement) {
    return calledElement;
  }

  return null;
}

/**
 * Check if an element is a Call Activity.
 *
 * @param {Object} element - The bpmn-js element
 * @returns {boolean}
 */
export function isCallActivity(element) {
  return element.type === 'bpmn:CallActivity';
}
