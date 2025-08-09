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

export const setLogAdapter = (adapter: LogAdapter) => {
  logAdapter = adapter;
};

const writeLog = (message: string, level: LogLevel = LogLevel.INFO, method?: string) => {
  logAdapter.log(level, message, method);
};

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  const method = req.method;
  const url = req.url;
  const startTime = Date.now();
  
  (req as any).requestId = requestId;
  
  writeLog(`[${requestId}] ${url} - Request started`, LogLevel.INFO, method);
  

  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    writeLog(`[${requestId}] ${url} - Request completed in ${duration}ms`, LogLevel.INFO, method);
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
};

class Log {
  info(message: string) {
    writeLog(message, LogLevel.INFO);
  }

  warn(message: string) {
    writeLog(message, LogLevel.WARN);
  }

  debug(message: string) {
    writeLog(message, LogLevel.DEBUG);
  }

  error(message: string) {
    writeLog(message, LogLevel.ERROR);
  }
}

export const log = new Log();
export type { LogAdapter };
