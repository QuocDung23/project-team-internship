export interface ErrorTranslation {
  key: string;
  values?: Record<string, string | number>;
}

interface ApiErrorShape {
  status?: unknown;
  name?: unknown;
}

function isApiErrorShape(error: unknown): error is ApiErrorShape {
  return typeof error === "object" && error !== null;
}

export function getErrorTranslation(
  error: unknown,
  fallbackKey = "common:errors.generic",
): ErrorTranslation {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { key: "common:errors.requestTimeout" };
  }

  if (isApiErrorShape(error)) {
    if (error.status === 401 || error.status === 403) {
      return { key: "common:errors.unauthorized" };
    }
    if (error.status === 404) {
      return { key: "common:errors.notFound" };
    }
    if (error.status === 409) {
      return { key: "common:errors.conflict" };
    }
    if (error.status === 422) {
      return { key: "common:errors.validation" };
    }
    if (typeof error.status === "number" && error.status >= 500) {
      return { key: "common:errors.backendUnavailable" };
    }
  }

  if (error instanceof TypeError) {
    return { key: "common:errors.networkUnavailable" };
  }

  return { key: fallbackKey };
}
