import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let activeServer = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, activeServer);
  } else {
    serveStatic(app);
  }

  // Try to start the server with graceful error handling
  const startServer = async (port: number): Promise<void> => {
    try {
      // Close any existing server
      if (activeServer.listening) {
        await new Promise((resolve) => activeServer.close(resolve));
      }

      await new Promise<void>((resolve, reject) => {
        activeServer = registerRoutes(app);
        activeServer.listen(port, "0.0.0.0", () => {
          log(`Server started successfully on port ${port}`);
          resolve();
        }).on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} is in use`);
            reject(new Error(`Port ${port} is in use`));
          } else {
            reject(err);
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Port')) {
        if (port < 5010) {
          log(`Attempting to start on port ${port + 1}`);
          await startServer(port + 1);
        } else {
          throw new Error('No available ports found between 5000 and 5010');
        }
      } else {
        throw error;
      }
    }
  };

  const gracefulShutdown = async () => {
    log('Received shutdown signal');
    if (activeServer.listening) {
      await new Promise((resolve) => activeServer.close(resolve));
      log('Server closed gracefully');
    }
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  try {
    await startServer(5000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();