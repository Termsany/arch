import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod/v4";

export type ApiErrorPayload = {
  success: false;
  message: string;
  errors?: unknown;
};

export class HttpError extends Error {
  status: number;
  errors?: unknown;

  constructor(status: number, message: string, errors?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }
}

export function ok<T>(res: Response, data: T, status = 200, message = "تمت العملية بنجاح"): void {
  res.status(status).json({ success: true, data, message });
}

export function fail(res: Response, status: number, message: string, errors?: unknown): void {
  res.status(status).json({ success: false, message, errors });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new HttpError(400, "البيانات المدخلة غير صحيحة", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new HttpError(400, "معاملات الطلب غير صحيحة", result.error.flatten()));
      return;
    }
    req.params = result.data as Request["params"];
    next();
  };
}

export function apiResponseEnvelope(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = (body?: unknown): Response => {
    if (
      body &&
      typeof body === "object" &&
      "success" in body &&
      typeof (body as { success?: unknown }).success === "boolean"
    ) {
      const existing = body as Record<string, unknown>;
      if (existing.success === false && !("message" in existing) && "error" in existing) {
        existing.message = existing.error;
        delete existing.error;
      }
      if (existing.success === true && !("data" in existing)) {
        const { success, message, ...rest } = existing;
        return originalJson({
          success,
          data: Object.keys(rest).length ? rest : null,
          message: message ?? "تمت العملية بنجاح",
        });
      }
      return originalJson(existing);
    }

    if (res.statusCode >= 400) {
      const payload = normalizeErrorBody(body, res.statusCode);
      return originalJson(payload);
    }

    return originalJson({
      success: true,
      data: body ?? null,
      message: "تمت العملية بنجاح",
    });
  };

  next();
}

function normalizeErrorBody(body: unknown, status: number): ApiErrorPayload {
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : defaultErrorMessage(status);
    return {
      success: false,
      message,
      errors: data.errors,
    };
  }

  return {
    success: false,
    message: typeof body === "string" ? body : defaultErrorMessage(status),
  };
}

function defaultErrorMessage(status: number): string {
  if (status === 401) return "انتهت الجلسة أو غير مصرح بالدخول";
  if (status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  if (status === 404) return "المورد غير موجود";
  if (status === 429) return "طلبات كثيرة جداً، يرجى المحاولة لاحقاً";
  return "حدث خطأ في الخادم";
}

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `المسار غير موجود: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    fail(res, err.status, err.message, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    fail(res, 400, "البيانات المدخلة غير صحيحة", err.flatten());
    return;
  }

  if (err instanceof Error && err.name === "MulterError") {
    fail(res, 400, err.message);
    return;
  }

  req.log?.error(err);
  fail(res, 500, "حدث خطأ في الخادم");
}
