package logger

import (
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

var log *logrus.Logger

func init() {
	log = logrus.New()

	// Set default configuration
	log.SetOutput(os.Stdout)
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
	})

	// Set log level based on environment
	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "info":
		log.SetLevel(logrus.InfoLevel)
	case "warn":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	default:
		// Default to info level
		log.SetLevel(logrus.InfoLevel)
	}
}

// GetLogger returns the configured logger instance
func GetLogger() *logrus.Logger {
	return log
}

// Fields type for structured logging fields
type Fields logrus.Fields

// Wrapper functions for common log levels

// Debug logs a debug message with structured fields
func Debug(msg string, fields Fields) {
	log.WithFields(logrus.Fields(fields)).Debug(msg)
}

// Info logs an info message with structured fields
func Info(msg string, fields Fields) {
	log.WithFields(logrus.Fields(fields)).Info(msg)
}

// Warn logs a warning message with structured fields
func Warn(msg string, fields Fields) {
	log.WithFields(logrus.Fields(fields)).Warn(msg)
}

// Error logs an error message with structured fields
func Error(msg string, err error, fields Fields) {
	if fields == nil {
		fields = Fields{}
	}
	if err != nil {
		fields["error"] = err.Error()
	}
	log.WithFields(logrus.Fields(fields)).Error(msg)
}

// Fatal logs a fatal message with structured fields and exits the application
func Fatal(msg string, err error, fields Fields) {
	if fields == nil {
		fields = Fields{}
	}
	if err != nil {
		fields["error"] = err.Error()
	}
	log.WithFields(logrus.Fields(fields)).Fatal(msg)
}
