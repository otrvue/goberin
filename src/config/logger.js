import winston from "winston";
import "winston-daily-rotate-file";

const { combine, timestamp, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    // Daily Rotate File for errors
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    // Daily Rotate File for combined logs
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      )
    }),
  ],
});

export default logger;
