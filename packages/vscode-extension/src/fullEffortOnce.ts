/**
 * One-shot flag: next chat request uses high effort. Cleared after that request.
 */

let useFullEffortNextRequest = false;

export function getAndClearFullEffortOnce(): boolean {
  const v = useFullEffortNextRequest;
  useFullEffortNextRequest = false;
  return v;
}

export function setFullEffortOnce(): void {
  useFullEffortNextRequest = true;
}
