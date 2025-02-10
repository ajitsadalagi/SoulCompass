import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { users, products, productAdmins } from "@shared/schema";
import WebSocket from "ws";

// Configure WebSocket connection
if (!global.WebSocket) {
  (global as any).WebSocket = WebSocket;
}

// Initialize database connection with WebSocket configuration
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Create drizzle database instance
export const db = drizzle(pool, { schema: { users, products, productAdmins } });