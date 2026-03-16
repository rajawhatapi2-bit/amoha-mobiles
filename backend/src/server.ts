import app from './app';
import connectDB from './config/db';
import env from './config/env';
import logger from './utils/logger.util';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Render provides PORT dynamically
    const PORT = process.env.PORT || env.PORT || 5000;

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 AMOHA Mobiles API running on port ${PORT}`);
      logger.info(`📦 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: /health`);
      logger.info(`📡 API Base: /api`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();