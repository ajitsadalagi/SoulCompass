import { ADMIN_ROLES, ADMIN_STATUSES, type User, type InsertUser, type Product, type ProductAdmin, type InsertProduct } from "@shared/schema";
import { users, products, productAdmins, userAdminTags } from "@shared/schema"; // Added import for userAdminTags
import { db } from "./db";
import { eq, and, asc, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  createProduct(product: InsertProduct & { sellerId: number; localAdminIds: number[] }): Promise<Product>;
  getProducts(): Promise<(Product & { admins: User[] })[]>;
  getProductById(id: number): Promise<(Product & { admins: User[] }) | undefined>;
  incrementProductViews(id: number): Promise<void>;
  incrementContactRequests(id: number): Promise<void>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  sessionStore: session.Store;
  getAdminUsers(): Promise<User[]>;
  getAdminRequests(adminType: string): Promise<User[]>;
  approveAdminRequest(userId: number, approvedById: number): Promise<User | undefined>;
  rejectAdminRequest(userId: number, approvedById: number, reason: string): Promise<User | undefined>;
  requestAdminRole(userId: number, adminType: string): Promise<User | undefined>;
  getPendingAdmins(): Promise<User[]>;
  getSuperAdmins(): Promise<User[]>;
  getLocalAdmins(): Promise<User[]>;
  getProductAdmins(productId: number): Promise<User[]>;
  getProductsByLocalAdmin(adminId: number): Promise<Product[]>;
  associateProductWithAdmins(productId: number, adminIds: number[]): Promise<void>;
  getProductsBySellerId(sellerId: number): Promise<(Product & { admins: User[] })[]>;
  registerAdminRole(userId: number, adminType: string): Promise<User | undefined>;
  requestAdminApproval(userId: number, adminType: string, requestedAdminId?: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  // Add new methods for admin tagging
  tagAdmin(userId: number, adminId: number): Promise<void>;
  untagAdmin(userId: number, adminId: number): Promise<void>;
  getTaggedAdmins(userId: number): Promise<User[]>;
  getNearbyAdmins(latitude: number, longitude: number, radiusKm: number): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;

    const taggedAdmins = await this.getTaggedAdmins(id);
    return { ...user, taggedAdmins };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      roles: userData.roles || ["buyer"],
      adminType: userData.adminType || ADMIN_ROLES.NONE,
      adminStatus: userData.adminStatus || ADMIN_STATUSES.NONE,
    }).returning();

    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // First, get all products owned by this user
    const userProducts = await db.select({ id: products.id })
      .from(products)
      .where(eq(products.sellerId, id));

    const productIds = userProducts.map(p => p.id);

    // Delete product_admin associations for all user's products
    if (productIds.length > 0) {
      await db.delete(productAdmins)
        .where(sql`${productAdmins.productId} IN (${sql.join(productIds, sql`, `)})`);
    }

    // Delete all products owned by this user
    await db.delete(products)
      .where(eq(products.sellerId, id));

    // Remove any references in the product_admins table where this user is an admin
    await db.delete(productAdmins)
      .where(eq(productAdmins.adminId, id));

    // Update any users who were approved by this user
    await db.update(users)
      .set({
        approvedBy: null,
        adminApprovalDate: null,
        adminRejectionReason: null
      })
      .where(eq(users.approvedBy, id));

    // Update any users who requested approval from this user
    await db.update(users)
      .set({
        requestedAdminId: null
      })
      .where(eq(users.requestedAdminId, id));

    // Then delete the user
    await db.delete(users)
      .where(eq(users.id, id));
  }

  async createProduct(productData: InsertProduct & { sellerId: number; localAdminIds: number[] }): Promise<Product> {
    const { localAdminIds = [], ...productValues } = productData;

    // Insert the product
    const [product] = await db.insert(products)
      .values({
        ...productValues,
        views: 0,
        contactRequests: 0,
        active: true,
        createdAt: new Date(),
      })
      .returning();

    // Associate product with admins if any
    if (localAdminIds.length > 0) {
      await db.insert(productAdmins)
        .values(
          localAdminIds.map(adminId => ({
            productId: product.id,
            adminId,
            createdAt: new Date(),
          }))
        );
    }

    return product;
  }

  async getProducts(): Promise<(Product & { admins: User[] })[]> {
    const allProducts = await db.select()
      .from(products)
      .where(eq(products.active, true));

    const productsWithAdmins = await Promise.all(
      allProducts.map(async (product) => ({
        ...product,
        admins: await this.getProductAdmins(product.id),
      }))
    );

    return productsWithAdmins;
  }

  async getProductById(id: number): Promise<(Product & { admins: User[] }) | undefined> {
    const [product] = await db.select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.active, true)
        )
      );

    if (!product) return undefined;

    const admins = await this.getProductAdmins(id);
    return { ...product, admins };
  }

  async incrementProductViews(id: number): Promise<void> {
    await db.update(products)
      .set({
        views: sql`${products.views} + 1`
      })
      .where(eq(products.id, id));
  }

  async incrementContactRequests(id: number): Promise<void> {
    await db.update(products)
      .set({
        contactRequests: sql`${products.contactRequests} + 1`
      })
      .where(eq(products.id, id));
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
    const [product] = await db.update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.update(products)
      .set({ active: false })
      .where(eq(products.id, id));
  }

  async getAdminUsers(): Promise<User[]> {
    // Return all users except the master admin
    return db.select()
      .from(users)
      .orderBy(asc(users.id));
  }

  async getAdminRequests(adminType: string): Promise<User[]> {
    return db.select()
      .from(users)
      .where(
        and(
          eq(users.adminType, adminType),
          eq(users.adminStatus, ADMIN_STATUSES.PENDING)
        )
      );
  }

  async approveAdminRequest(userId: number, approvedById: number): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        adminStatus: ADMIN_STATUSES.APPROVED,
        approvedBy: approvedById,
        adminApprovalDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async rejectAdminRequest(userId: number, approvedById: number, reason: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        adminStatus: ADMIN_STATUSES.REJECTED,
        approvedBy: approvedById,
        adminRejectionReason: reason,
        adminApprovalDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async requestAdminRole(userId: number, adminType: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        adminType,
        adminStatus: ADMIN_STATUSES.REGISTERED,
        adminRequestDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getPendingAdmins(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(eq(users.adminStatus, ADMIN_STATUSES.PENDING));
  }

  async getSuperAdmins(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(
        and(
          eq(users.adminType, ADMIN_ROLES.SUPER_ADMIN),
          eq(users.adminStatus, ADMIN_STATUSES.APPROVED)
        )
      );
  }

  async getLocalAdmins(): Promise<User[]> {
    return db.select()
      .from(users)
      .where(
        and(
          eq(users.adminType, ADMIN_ROLES.LOCAL_ADMIN),
          eq(users.adminStatus, ADMIN_STATUSES.APPROVED)
        )
      );
  }

  async getProductAdmins(productId: number): Promise<User[]> {
    const adminRelations = await db.select({
      adminId: productAdmins.adminId
    })
      .from(productAdmins)
      .where(eq(productAdmins.productId, productId));

    if (adminRelations.length === 0) return [];

    // Get all admin IDs
    const adminIds = adminRelations.map(relation => relation.adminId);

    // Fetch all admins using IN operator
    return db.select()
      .from(users)
      .where(
        sql`${users.id} IN (${sql.join(adminIds, sql`, `)})`
      );
  }

  async getProductsByLocalAdmin(adminId: number): Promise<Product[]> {
    const adminProducts = await db.select({
      productId: productAdmins.productId
    })
      .from(productAdmins)
      .where(eq(productAdmins.adminId, adminId));

    if (adminProducts.length === 0) return [];

    return db.select()
      .from(products)
      .where(
        and(
          eq(products.id, adminProducts.map(ap => ap.productId)),
          eq(products.active, true)
        )
      );
  }

  async associateProductWithAdmins(productId: number, adminIds: number[]): Promise<void> {
    // First remove existing associations
    await db.delete(productAdmins)
      .where(eq(productAdmins.productId, productId));

    // Then add new associations
    if (adminIds.length > 0) {
      await db.insert(productAdmins)
        .values(
          adminIds.map(adminId => ({
            productId,
            adminId,
            createdAt: new Date(),
          }))
        );
    }
  }

  async getProductsBySellerId(sellerId: number): Promise<(Product & { admins: User[] })[]> {
    const sellerProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.sellerId, sellerId),
          eq(products.active, true)
        )
      );

    return Promise.all(
      sellerProducts.map(async (product) => ({
        ...product,
        admins: await this.getProductAdmins(product.id),
      }))
    );
  }

  async registerAdminRole(userId: number, adminType: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        adminType,
        adminStatus: ADMIN_STATUSES.REGISTERED,
        adminRequestDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async requestAdminApproval(userId: number, adminType: string, requestedAdminId?: number): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        adminType,
        adminStatus: ADMIN_STATUSES.PENDING,
        adminRequestDate: new Date(),
        requestedAdminId,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  async tagAdmin(userId: number, adminId: number): Promise<void> {
    await db.insert(userAdminTags)
      .values({
        userId,
        adminId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  }

  async untagAdmin(userId: number, adminId: number): Promise<void> {
    await db.delete(userAdminTags)
      .where(
        and(
          eq(userAdminTags.userId, userId),
          eq(userAdminTags.adminId, adminId)
        )
      );
  }

  async getTaggedAdmins(userId: number): Promise<User[]> {
    const tags = await db.select({
      adminId: userAdminTags.adminId
    })
      .from(userAdminTags)
      .where(eq(userAdminTags.userId, userId));

    if (tags.length === 0) return [];

    const adminIds = tags.map(tag => tag.adminId);

    return db.select()
      .from(users)
      .where(sql`${users.id} IN (${sql.join(adminIds, sql`, `)})`);
  }

  async getNearbyAdmins(latitude: number, longitude: number, radiusKm: number): Promise<User[]> {
    // Use Haversine formula to calculate distance
    const haversine = `
      6371 * acos(
        cos(radians($1)) * 
        cos(radians(latitude)) * 
        cos(radians(longitude) - radians($2)) + 
        sin(radians($1)) * 
        sin(radians(latitude))
      )
    `;

    const result = await db.execute(
      sql`
        SELECT *, ${sql.raw(haversine)} as distance
        FROM ${users}
        WHERE (${sql.raw(haversine)} <= $3)
        AND admin_type IN ('local_admin', 'super_admin')
        AND admin_status = 'approved'
        ORDER BY distance
      `,
      [latitude, longitude, radiusKm]
    );

    return result.rows as User[];
  }
}

export const storage = new DatabaseStorage();