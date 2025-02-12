import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { MemoryStore } from 'express-session';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || 'fallback-secret-key',
    resave: true, 
    saveUninitialized: true, 
    store: new MemoryStore({
      checkPeriod: 86400000 
    }),
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, 
      sameSite: 'lax',
      path: '/',
    },
    name: 'sessionId'
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting login for user:", username);
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log("Login failed for user:", username);
          return done(null, false, { message: "Invalid username or password" });
        }
        console.log("Login successful for user:", username, "with roles:", user.roles);
        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id, "with roles:", user.roles);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("User deserialized:", user.id, "with roles:", user.roles);
      done(null, user);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  // Add back the login route with proper JSON response handling
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({
          message: "Internal server error",
          error: err.message
        });
      }
      if (!user) {
        return res.status(401).json({
          message: info?.message || "Invalid username or password",
          error: "INVALID_CREDENTIALS"
        });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          return res.status(500).json({
            message: "Failed to create session",
            error: loginErr.message
          });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  // Add back the register route
  app.post("/api/register", async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
          error: "USERNAME_EXISTS"
        });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to create session",
            error: err.message
          });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({
        message: "Failed to register user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add back the logout route
  app.post("/api/logout", (req, res) => {
    if (req.user) {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to logout",
            error: err.message
          });
        }
        res.clearCookie('sessionId').sendStatus(200);
      });
    } else {
      res.sendStatus(200);
    }
  });

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log("Auth check:", {
      isAuthenticated: req.isAuthenticated(),
      session: req.session?.id,
      user: req.user?.id,
      path: req.path
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }
    next();
  };

  return { requireAuth };
}