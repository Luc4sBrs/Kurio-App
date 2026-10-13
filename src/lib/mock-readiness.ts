let mockReadiness: Promise<unknown> = Promise.resolve()

export function setMockReadiness(promise: Promise<unknown>) {
  mockReadiness = promise
}

export function waitForMockReadiness() {
  return mockReadiness.then(() => undefined)
}
