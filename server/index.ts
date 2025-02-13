import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import os from 'os';

const app = express();

// Parse JSON payloads first
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add API-specific middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Add CORS middleware for Expo Go
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:19000', // Expo development server
    'http://localhost:19006', // Expo web
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Local network IPs
    /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Local network IPs
    /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/ // Local network IPs
  ];

  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed =>
      typeof allowed === 'string'
        ? allowed === origin
        : allowed.test(origin)
    );

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
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
      log(logLine);
    }
  });

  next();
});

// API error handling middleware - add before routes
app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message, error: String(err) });
});

let activeServer: ReturnType<typeof registerRoutes> | null = null;

async function closeServer(): Promise<void> {
  if (activeServer && activeServer.listening) {
    return new Promise((resolve) => {
      activeServer!.close(() => {
        activeServer = null;
        resolve();
      });
    });
  }
  return Promise.resolve();
}

async function startServer(port: number, maxRetries: number = 10): Promise<void> {
  try {
    await closeServer();

    // Create new server instance first
    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      // Setup Vite with the server instance
      await setupVite(app, server);
    } else {
      // Serve static files in production
      serveStatic(app);
    }

    await new Promise<void>((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        activeServer = server;
        const addresses = getNetworkAddresses();
        log(`Server started successfully on port ${port}`);
        log(`Server is accessible at: http://localhost:${port}`);
        log('Available network addresses for Expo Go:');
        addresses.forEach(addr => {
          log(`  http://${addr}:${port}`);
        });
        resolve();
      }).on('error', async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          if (maxRetries > 0) {
            log(`Port ${port} is in use, trying port ${port + 1}`);
            try {
              await startServer(port + 1, maxRetries - 1);
              resolve();
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(new Error('No available ports found after maximum retries'));
          }
        } else {
          reject(err);
        }
      });
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Helper function for network addresses
function getNetworkAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const [, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Start the server
(async () => {
  try {
    await startServer(5000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();