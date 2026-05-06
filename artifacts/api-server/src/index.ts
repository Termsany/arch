import app from "./app";
import { validateEnv } from "./lib/env";
import { logger } from "./lib/logger";

const env = validateEnv();
const port = env.port;

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
