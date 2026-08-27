enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  private formatLog(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level}] ${message}${logData}`;
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: any): void {
    console.log(this.formatLog(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatLog(LogLevel.WARN, message, data));
  }

  error(message: string, error?: Error | unknown, data?: any): void {
    let errorInfo = "";
    if (error instanceof Error) {
      errorInfo = ` | Error: ${error.message} | Stack: ${error.stack}`;
    } else if (error) {
      errorInfo = ` | ${String(error)}`;
    }

    const logData = data ? ` | ${JSON.stringify(data)}` : "";
    console.error(this.formatLog(LogLevel.ERROR, message, data) + errorInfo);
  }
}

export const logger = new Logger();
