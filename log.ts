import { join } from "path";
import { existsSync, mkdirSync, appendFileSync } from "fs";
import crypto from "node:crypto";
import chalk from "chalk";
import type { Request, Response, NextFunction } from "express";

// Define log levels
export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

const logDir = join(process.cwd(), "log");
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

interface LogAdapter {
  log(level: LogLevel, message: string, method?: string): void;
}

class DefaultLogAdapter implements LogAdapter {
  /**
   * Writes a log message.
   *
   * @param level The log level for the message. One of:
   *   - `LogLevel.INFO`
   *   - `LogLevel.WARN`
   *   - `LogLevel.ERROR`
   *   - `LogLevel.DEBUG`
   * @param message The log message to be written.
   * @param method The HTTP method the log message is related to. Optional.
   */
  log(level: LogLevel, message: string, method?: string) {
    try {
      const timestamp = new Date().toLocaleString();
      const methodColor = method ? chalk.cyan(`${method} `) : "";
      const logMessage = `[${level}] ${method ? `${method} ` : ""}${timestamp}: ${message}\n`;
      const coloredMessage = `[${level}] ${methodColor}${timestamp}: ${message}\n`;

      appendFileSync(join(logDir, "app.log"), logMessage);

      switch (level) {
        case LogLevel.ERROR:
          console.error(coloredMessage.replace(`[${level}]`, chalk.red(`[${level}]`)));
          break;
        case LogLevel.WARN:
          console.warn(coloredMessage.replace(`[${level}]`, chalk.yellow(`[${level}]`)));
          break;
        case LogLevel.DEBUG:
          console.debug(coloredMessage.replace(`[${level}]`, chalk.gray(`[${level}]`)));
          break;
        default:
          console.log(coloredMessage.replace(`[${level}]`, chalk.blue(`[${level}]`)));
      }
    } catch (error) {
      console.error(`Failed to write log: ${error}`);
    }
  }
}

let logAdapter: LogAdapter = new DefaultLogAdapter();

/**
 * Sets the log adapter to be used by the logger.
 *
 * @param {LogAdapter} adapter The log adapter to use.
 *
 * @example
 * import { setLogAdapter } from "./log";
 * import { ConsoleLogAdapter } from "./logAdapterFactory";
 *
 * setLogAdapter(new ConsoleLogAdapter());
 */
export const setLogAdapter = (adapter: LogAdapter) => {
  logAdapter = adapter;
};

/**
 * Logs a message at the specified log level using the current log adapter.
 *
 * @param {string} message The message to be logged.
 * @param {LogLevel} [level=LogLevel.INFO] The log level for the message. Default is INFO.
 * @param {string} [method] The HTTP method associated with the log message. Optional.
 */

const writeLog = (message: string, level: LogLevel = LogLevel.INFO, method?: string) => {
  logAdapter.log(level, message, method);
};

/**
 * Express middleware that logs each request and response.
 *
 * @param {Request} req The request object.
 * @param {Response} res The response object.
 * @param {NextFunction} next The next middleware function in the stack.
 */

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  const method = req.method;
  const url = req.url;
  const startTime = Date.now();
  
  (req as any).requestId = requestId;
  
  writeLog(`[${requestId}] ${url} - Request started`, LogLevel.INFO, method);
  

  const originalEnd = res.end.bind(res);
  /**
   * Override the response end method to log the request completion time.
   * @param {any} [chunk] The response body.
   * @param {string} [encoding] The encoding of the response body.
   * @param {function} [cb] The callback function to be called after the response is sent.
   * @returns {Response} The response object.
   */
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    writeLog(`[${requestId}] ${url} - Request completed in ${duration}ms`, LogLevel.INFO, method);
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
};

class Log {
  /**
   * Writes a log message at the INFO level.
   *
   * @param {string} message The log message to be written.
   */
  info(message: string) {
    writeLog(message, LogLevel.INFO);
  }

  /**
   * Writes a log message at the WARN level.
   *
   * @param {string} message The log message to be written.
   */
  warn(message: string) {
    writeLog(message, LogLevel.WARN);
  }

  /**
   * Writes a log message at the DEBUG level.
   *
   * @param {string} message The log message to be written.
   */

  debug(message: string) {
    writeLog(message, LogLevel.DEBUG);
  }

  /**
   * Writes a log message at the ERROR level.
   *
   * @param {string} message The log message to be written.
   */

  error(message: string) {
    writeLog(message, LogLevel.ERROR);
  }
}

export const log = new Log();
export type { LogAdapter };
