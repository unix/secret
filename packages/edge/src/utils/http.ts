type JsonContext = {
  readonly json: (value: unknown, status?: number) => Response
}

type BodyContext = {
  readonly body: (data: BodyInit | null, status?: number) => Response
}

type ErrorBody = {
  readonly error: string
  readonly details?: unknown
}

const json = (
  c: JsonContext,
  status: number,
  message: string,
  details?: unknown,
): Response => {
  const body: ErrorBody =
    details === undefined ? { error: message } : { error: message, details }

  return c.json(body, status)
}

const badRequest = (
  c: JsonContext,
  message: string,
  details?: unknown,
): Response => {
  return json(c, 400, message, details)
}

const notFound = (
  c: JsonContext,
  message = 'Not found.',
  details?: unknown,
): Response => {
  return json(c, 404, message, details)
}

const conflict = (c: JsonContext, message: string, details?: unknown): Response => {
  return json(c, 409, message, details)
}

const notImplemented = (
  c: JsonContext,
  message: string,
  details?: unknown,
): Response => {
  return json(c, 501, message, details)
}

const badGateway = (
  c: JsonContext,
  message: string,
  details?: unknown,
): Response => {
  return json(c, 502, message, details)
}

const gone = (c: JsonContext, message: string, details?: unknown): Response => {
  return json(c, 410, message, details)
}

const serverError = (
  c: JsonContext,
  message: string,
  details?: unknown,
): Response => {
  return json(c, 500, message, details)
}

const noContent = (c: BodyContext): Response => {
  return c.body(null, 204)
}

export const http = {
  json,
  badRequest,
  notFound,
  conflict,
  notImplemented,
  badGateway,
  gone,
  serverError,
  noContent,
}
