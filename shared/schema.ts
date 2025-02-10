import { pgTable, text, serial, integer, boolean, timestamp, decimal, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define table names as const for referencing
const TABLE_NAMES = {
  USERS: "users",
  PRODUCTS: "products",
  PRODUCT_ADMINS: "product_admins"
} as const;

// Define admin roles as const for type safety
export const ADMIN_ROLES = {
  MASTER_ADMIN: "master_admin",
  SUPER_ADMIN: "super_admin",
  LOCAL_ADMIN: "local_admin",
  NONE: "none"
} as const;

export const ADMIN_STATUSES = {
  NONE: "none",
  REGISTERED: "registered",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];
export type AdminStatus = (typeof ADMIN_STATUSES)[keyof typeof ADMIN_STATUSES];

// User table definition
export const users = pgTable(TABLE_NAMES.USERS, {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  password: text("password").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  roles: text("roles").array().notNull().default(['buyer']),
  location: text("location"),
  profilePicture: text("profile_picture"),
  verified: boolean("verified").default(false),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  adminType: text("admin_type", { enum: Object.values(ADMIN_ROLES) }).notNull().default(ADMIN_ROLES.NONE),
  adminStatus: text("admin_status", { enum: Object.values(ADMIN_STATUSES) }).notNull().default(ADMIN_STATUSES.NONE),
  approvedBy: integer("approved_by").references(() => users.id),
  adminRequestDate: timestamp("admin_request_date"),
  adminApprovalDate: timestamp("admin_approval_date"),
  adminRejectionReason: text("admin_rejection_reason"),
  requestedAdminId: integer("requested_admin_id").references(() => users.id),
});

export const products = pgTable(TABLE_NAMES.PRODUCTS, {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  name: text("name").notNull(),
  image: text("image").notNull().default('📦'),  // Default to a package emoji
  quantity: integer("quantity").notNull(),
  quality: text("quality").notNull(),
  availabilityDate: timestamp("availability_date").notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  city: text("city").notNull(),
  state: text("state").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  condition: text("condition", { enum: ["new", "used", "perishable"] }).notNull(),
  category: text("category", { enum: ["fruits", "vegetables", "dairy", "other"] }).notNull(),
  views: integer("views").default(0),
  contactRequests: integer("contact_requests").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New junction table for product-admin associations
export const productAdmins = pgTable(TABLE_NAMES.PRODUCT_ADMINS, {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  adminId: integer("admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  roles: z.array(z.enum(["buyer", "seller", "local_admin", "super_admin", "master_admin"])).default(["buyer"]),
  adminType: z.enum(Object.values(ADMIN_ROLES) as [string, ...string[]]).default(ADMIN_ROLES.NONE),
  adminStatus: z.enum(Object.values(ADMIN_STATUSES) as [string, ...string[]]).default(ADMIN_STATUSES.NONE),
}).pick({
  username: true,
  firstName: true,
  lastName: true,
  password: true,
  mobileNumber: true,
  roles: true,
  location: true,
  profilePicture: true,
  latitude: true,
  longitude: true,
  adminType: true,
  adminStatus: true,
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  location: z.string().optional(),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits")
    .regex(/^[0-9]+$/, "Mobile number must contain only digits"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const insertProductSchema = createInsertSchema(products, {
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  quality: z.string().min(1, "Quality description is required"),
  targetPrice: z.coerce.number().min(0, "Price must be positive"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  condition: z.enum(["new", "used", "perishable"]),
  category: z.enum(["fruits", "vegetables", "dairy", "other"]),
  name: z.string().min(1, "Product name is required"),
  image: z.string().min(1, "Product image is required"),
  availabilityDate: z.coerce.date(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).extend({
  localAdminIds: z.array(z.number()).optional(), // Make localAdminIds optional
}).pick({
  name: true,
  image: true,
  quantity: true,
  quality: true,
  targetPrice: true,
  city: true,
  state: true,
  condition: true,
  category: true,
  availabilityDate: true,
  latitude: true,
  longitude: true,
  localAdminIds: true,
});

export const insertProductAdminSchema = createInsertSchema(productAdmins);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect & {
  admins?: User[];
};
export type ProductAdmin = typeof productAdmins.$inferSelect;
export type InsertProductAdmin = z.infer<typeof insertProductAdminSchema>;
export type SelectUser = z.infer<typeof insertUserSchema>;