import "dotenv/config";
import express from "express";
import { log, logger } from "./log";

const port = process.env.PORT;

const app = express()
  .use(logger)
  .use(express.json())
  .use(express.urlencoded({ extended: true }));

/**
 * Starts the Express server and listens on the specified port.
 *
 * Logs an informational message once the server is running.
 * If the server fails to start, logs an error message and exits the process.
 */

export const startServer = () => {
  try {
    app.listen(port, () => {
      log.info(`Server running on port ${port}`);
    });
  } catch (error) {
    log.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
};
