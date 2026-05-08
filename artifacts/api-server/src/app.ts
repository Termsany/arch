import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiResponseEnvelope, errorHandler, fail, notFoundHandler } from "./lib/http";
import { localeMiddleware } from "./middleware/locale";

const app: Express = express();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function wildcardOriginToRegExp(origin: string): RegExp | null {
  const normalized = normalizeOrigin(origin);
  if (!normalized.includes("*")) return null;

  const escaped = normalized
    .replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
    .replace(/\*/g, "[^/]+?");

  return new RegExp(`^${escaped}$`);
}

const configuredOrigins = (process.env["FRONTEND_URL"] || "http://localhost:5173")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = configuredOrigins.filter((origin) => !origin.includes("*"));
const allowedOriginPatterns = configuredOrigins
  .map(wildcardOriginToRegExp)
  .filter((pattern): pattern is RegExp => pattern !== null);

function isOriginAllowed(origin: string): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  return (
    allowedOrigins.includes(normalizedOrigin) ||
    allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin))
  );
}

app.set("trust proxy", 1);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow curl, server-to-server, health checks, and same-origin/no-origin requests
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (isOriginAllowed(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    logger.warn(
      {
        origin: normalizedOrigin,
        allowedOrigins,
        allowedOriginPatterns: allowedOriginPatterns.map((pattern) => pattern.source),
      },
      "CORS blocked origin",
    );

    // Do not throw an Error, because that becomes a 500.
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    fail(res, 429, "طلبات تسجيل الدخول كثيرة جداً، يرجى المحاولة لاحقاً");
  },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(helmet());

app.use(cors(corsOptions));

// Important: handle preflight before json/routes/rate limit
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(localeMiddleware);
app.use(apiResponseEnvelope);

// Apply rate limit only after preflight is handled
app.use("/api/auth", authLimiter);

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
