import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { insertProductSchema, insertUserSchema, updateProfileSchema } from "@shared/schema";
import { storage } from "./storage";
import { z } from "zod";

enum ADMIN_ROLES {
  LOCAL_ADMIN = "local_admin",
  SUPER_ADMIN = "super_admin",
  MASTER_ADMIN = "master_admin"
}

enum ADMIN_STATUSES {
  APPROVED = "approved",
  PENDING = "pending",
  REJECTED = "rejected",
  REGISTERED = "registered"
}

export function registerRoutes(app: Express): Server {
  const { requireAuth } = setupAuth(app);

  // Update the admin details route handler
  app.get("/api/users/admin/:id", requireAuth, async (req, res) => {
    try {
      const adminId = Number(req.params.id);
      const admin = await storage.getUser(adminId);

      if (!admin) {
        return res.status(404).json({
          message: "Admin not found",
          error: "Admin with the specified ID does not exist"
        });
      }

      // Check if requesting user is a master admin or approved super admin
      const isAdminUser = req.user?.adminType === 'master_admin' ||
        (req.user?.adminType === 'super_admin' && req.user?.adminStatus === 'approved');

      // For admin users, return full admin information
      if (isAdminUser) {
        return res.json({
          id: admin.id,
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          mobileNumber: admin.mobileNumber,
          location: admin.location,
          adminType: admin.adminType,
          adminStatus: admin.adminStatus,
          roles: admin.roles
        });
      }

      // For regular users, check if the admin is a local admin
      if (admin.adminType !== 'local_admin' || admin.adminStatus !== 'approved') {
        return res.status(403).json({
          message: "Cannot access this admin's details",
          error: "Admin not available"
        });
      }

      // Return only basic contact information for local admins
      res.json({
        id: admin.id,
        username: admin.username,
        name: admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.username,
        mobileNumber: admin.mobileNumber,
        location: admin.location
      });

    } catch (error) {
      console.error("Error fetching admin details:", error);
      res.status(500).json({
        message: "Failed to fetch admin details",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add new route to fetch all admins (for master admin)
  app.get("/api/users/admins", requireAuth, async (req, res) => {
    try {
      if (req.user?.adminType !== "master_admin") {
        return res.status(403).json({
          message: "Only master admin can access this route",
          error: "Insufficient permissions"
        });
      }

      const admins = await storage.getAdminUsers();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({
        message: "Failed to fetch administrators",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });


  // Add new route to fetch local admins
  app.get("/api/users/local-admins", requireAuth, async (req, res) => {
    try {
      // Allow access for sellers to list products
      if (!req.user?.roles.includes("seller")) {
        console.log("Unauthorized local admin access attempt:", {
          userId: req.user?.id,
          roles: req.user?.roles
        });
        return res.status(403).json({
          message: "Only sellers can view local admin list",
          error: "Insufficient permissions"
        });
      }

      const localAdmins = await storage.getLocalAdmins();
      console.log("Fetched local admins for user:", req.user.id, "count:", localAdmins.length);

      // Map to the expected format, removing sensitive information
      const mappedAdmins = localAdmins.map(admin => ({
        id: admin.id,
        username: admin.username,
        name: admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : null,
        location: admin.location,
        mobileNumber: admin.mobileNumber
      }));

      res.json(mappedAdmins);
    } catch (error) {
      console.error("Error fetching local admins:", error);
      res.status(500).json({
        message: "Failed to fetch local administrators",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });


  // Add new route to get admin stats and overview
  app.get("/api/admin/overview", requireAuth, async (req, res) => {
    try {
      if (!req.user?.roles.includes('master_admin')) {
        return res.status(403).json({
          message: "Only master admin can access this overview",
          error: "Insufficient permissions"
        });
      }

      const pendingAdmins = await storage.getPendingAdmins();
      const superAdmins = await storage.getSuperAdmins();
      const localAdmins = await storage.getLocalAdmins();

      res.json({
        stats: {
          pendingAdmins: pendingAdmins.length,
          superAdmins: superAdmins.length,
          localAdmins: localAdmins.length,
        },
        pendingAdmins,
        superAdmins,
        localAdmins,
      });
    } catch (error) {
      console.error("Error fetching admin overview:", error);
      res.status(500).json({
        message: "Failed to fetch admin overview",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add new route to fetch super admins
  app.get("/api/admin/super-admins", requireAuth, async (req, res) => {
    try {
      // Allow both local admins and master admins to view super admins
      if (!req.user?.adminType ||
        (req.user.adminType !== ADMIN_ROLES.LOCAL_ADMIN &&
          req.user.adminType !== ADMIN_ROLES.MASTER_ADMIN)) {
        console.log("Unauthorized access attempt:", req.user);
        return res.status(403).json({
          message: "Only local admins and master admins can fetch super admin list",
          error: "Insufficient permissions"
        });
      }

      console.log("Fetching super admins for user:", req.user);
      const superAdmins = await storage.getSuperAdmins();
      console.log("Found super admins:", superAdmins);

      // Filter to only return approved super admins
      const approvedSuperAdmins = superAdmins.filter(admin =>
        admin.adminStatus === "approved" && admin.adminType === ADMIN_ROLES.SUPER_ADMIN
      );

      res.json(approvedSuperAdmins);
    } catch (error) {
      console.error("Error fetching super admins:", error);
      res.status(500).json({
        message: "Failed to fetch super admins",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Admin requests route
  app.get("/api/admin/requests", requireAuth, async (req, res) => {
    console.log("Admin requests being fetched by:", req.user?.id, req.user?.adminType, req.user?.adminStatus);

    // Only master admin or approved super admin can view requests
    if (!req.user?.adminType || !["master_admin", "super_admin"].includes(req.user.adminType)) {
      console.log("Unauthorized admin request access:", req.user?.adminType);
      return res.status(403).send("Must be an approved admin to view requests");
    }

    try {
      let pendingRequests;

      // Master admin can see super admin requests
      if (req.user.adminType === "master_admin") {
        console.log("Master admin fetching super admin requests");
        pendingRequests = await storage.getAdminRequests("super_admin");
      }
      // Super admin can see local admin requests assigned to them
      else if (req.user.adminType === "super_admin" && req.user.adminStatus === "approved") {
        console.log("Super admin fetching local admin requests");
        pendingRequests = await storage.getAdminRequests("local_admin");
        // Filter requests to only show those assigned to this super admin
        pendingRequests = pendingRequests.filter(request => request.requestedAdminId === req.user?.id);
        console.log(`Filtered ${pendingRequests.length} requests for super admin ${req.user.id}`);
      }

      res.json(pendingRequests || []);
    } catch (error) {
      console.error("Error fetching admin requests:", error);
      res.status(500).json({
        message: "Failed to fetch admin requests",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Process admin request approval/rejection
  app.post("/api/admin/request", requireAuth, async (req, res) => {
    try {
      const { adminType, requestedAdminId } = req.body;
      console.log("Admin request:", {
        userId: req.user?.id,
        adminType,
        requestedAdminId,
        currentStatus: req.user?.adminStatus,
        currentType: req.user?.adminType
      });

      // Validate the requested admin type
      if (!["local_admin", "super_admin"].includes(adminType)) {
        return res.status(400).json({
          message: "Invalid admin type requested",
        });
      }

      // Initial registration when user has no admin role
      if (!req.user?.adminType || req.user.adminType === "none") {
        console.log("Processing initial admin registration");
        const updatedUser = await storage.registerAdminRole(req.user.id, adminType);
        if (!updatedUser) {
          return res.status(404).send("User not found");
        }

        req.login(updatedUser, (err) => {
          if (err) throw err;
          res.json(updatedUser);
        });
        return;
      }

      // Request for approval - user is already registered
      if (!["none", "registered", "pending"].includes(req.user?.adminStatus || "none")) {
        console.log("Invalid admin status for approval request:", req.user?.adminStatus);
        return res.status(400).json({
          message: "Cannot request approval - invalid current status",
        });
      }

      const updatedUser = await storage.requestAdminApproval(
        req.user.id,
        adminType,
        requestedAdminId
      );

      if (!updatedUser) {
        return res.status(404).send("User not found");
      }

      // Update session
      req.login(updatedUser, (err) => {
        if (err) throw err;
        res.json(updatedUser);
      });

    } catch (error) {
      console.error("Error handling admin request:", error);
      res.status(500).json({
        message: "Failed to process admin request",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Process admin request approval/rejection
  app.post("/api/admin/requests/:userId/:action", requireAuth, async (req, res) => {
    const { userId, action } = req.params;
    const { reason } = req.body;

    console.log("Processing admin request:", {
      userId,
      action,
      reason,
      processingAdmin: req.user?.id,
      adminType: req.user?.adminType,
      adminStatus: req.user?.adminStatus
    });

    try {
      const targetUser = await storage.getUser(Number(userId));
      if (!targetUser) {
        return res.status(404).send("User not found");
      }

      const canApprove = (
        (req.user?.adminType === "master_admin" && targetUser.adminType === "super_admin") ||
        (req.user?.adminType === "super_admin" && targetUser.adminType === "local_admin" && req.user?.adminStatus === "approved")
      );

      if (!canApprove) {
        console.log("Permission denied:", {
          userType: req.user?.adminType,
          userStatus: req.user?.adminStatus,
          targetType: targetUser.adminType
        });
        return res.status(403).send("Insufficient permissions to process this request");
      }

      let updatedUser;
      if (action === "approve") {
        updatedUser = await storage.approveAdminRequest(Number(userId), req.user?.id!);
      } else if (action === "reject") {
        if (!reason) {
          return res.status(400).send("Rejection reason is required");
        }
        updatedUser = await storage.rejectAdminRequest(Number(userId), req.user?.id!, reason);
      } else {
        return res.status(400).send("Invalid action");
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error processing admin request:", error);
      res.status(500).json({
        message: "Failed to process admin request",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();

      // Increment views for each product fetched
      await Promise.all(
        products.map(product => storage.incrementProductViews(product.id))
      );

      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Failed to fetch products");
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(Number(req.params.id));
      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Increment views before returning the product
      await storage.incrementProductViews(product.id);
      console.log(`Incremented views for product ${product.id}`);

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).send("Failed to fetch product");
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.roles.includes("seller")) {
      return res.status(403).send("Only sellers can create products");
    }

    try {
      console.log("Received product data:", req.body);
      console.log("Creating product for seller:", req.user.id);

      const productData = {
        ...req.body,
        availabilityDate: new Date(),
        // Ensure these are saved as numbers
        quantity: Number(req.body.quantity),
        targetPrice: req.body.targetPrice,
        latitude: req.body.latitude ? Number(req.body.latitude) : null,
        longitude: req.body.longitude ? Number(req.body.longitude) : null,
        sellerId: req.user.id,  // Explicitly set the sellerId
      };

      console.log("Processed product data:", productData);

      // Parse and validate the request data
      const validatedData = insertProductSchema.parse(productData);
      console.log("Validated product data:", validatedData);

      if (!validatedData.city || !validatedData.state) {
        return res.status(400).json({
          message: "Invalid product data",
          error: "City and state are required"
        });
      }

      // Create the product with the validated data and optional local admin IDs
      const product = await storage.createProduct({
        ...validatedData,
        sellerId: req.user.id,  // Ensure sellerId is set again
        localAdminIds: req.body.localAdminIds || [], 
      });

      console.log("Created product:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({
        message: "Invalid product data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.roles.includes("seller")) {
      return res.status(403).json({
        message: "Only sellers can update products",
        error: "Permission denied"
      });
    }

    try {
      const product = await storage.getProductById(Number(req.params.id));

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
          error: "Invalid product ID"
        });
      }

      if (product.sellerId !== req.user?.id) {
        return res.status(403).json({
          message: "You can only update your own products",
          error: "Permission denied"
        });
      }

      // Update the product
      const updatedProduct = await storage.updateProduct(product.id, req.body);

      if (!updatedProduct) {
        return res.status(404).json({
          message: "Failed to update product",
          error: "Product not found"
        });
      }

      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(400).json({
        message: "Failed to update product",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user?.roles.includes("seller")) {
      return res.status(403).send("Only sellers can delete products");
    }

    try {
      const product = await storage.getProductById(Number(req.params.id));

      if (!product) {
        return res.status(404).send("Product not found");
      }

      if (product.sellerId !== req.user?.id) {
        return res.status(403).send("You can only delete your own products");
      }

      await storage.deleteProduct(product.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).send("Failed to delete product");
    }
  });

  app.post("/api/products/:id/contact", async (req, res) => {
    console.log("Contact seller request received for product:", req.params.id);
    console.log("User making request:", req.user);
    console.log("Authentication status:", req.isAuthenticated());

    if (!req.isAuthenticated()) {
      console.log("Unauthorized contact attempt - user not authenticated");
      return res.status(401).json({
        message: "Must be logged in to contact sellers",
        error: "Authentication required"
      });
    }

    if (!req.user?.roles.includes("buyer")) {
      console.log("Unauthorized contact attempt - user not a buyer");
      return res.status(403).json({
        message: "Only buyers can contact sellers",
        error: "Invalid role"
      });
    }

    try {
      const product = await storage.getProductById(Number(req.params.id));
      if (!product) {
        console.log("Product not found:", req.params.id);
        return res.status(404).json({
          message: "Product not found",
          error: "Invalid product ID"
        });
      }

      console.log("Found product:", product);
      console.log("Attempting to find seller with ID:", product.sellerId);

      // Get seller information
      const seller = await storage.getUser(product.sellerId);
      if (!seller) {
        console.log("Seller not found for product:", product.id, "seller ID:", product.sellerId);
        return res.status(404).json({
          message: "Seller information not available",
          error: "Seller no longer exists"
        });
      }

      console.log("Found seller:", seller.id, seller.username);

      console.log("Incrementing contact requests for product:", product.id);
      await storage.incrementContactRequests(product.id);

      console.log("Contact request processed successfully");
      res.status(200).json({
        message: "Contact request processed successfully",
        seller: {
          name: seller.username,  // Always use username as fallback
          mobileNumber: seller.mobileNumber,
        }
      });
    } catch (error) {
      console.error("Error handling contact request:", error);
      res.status(500).json({
        message: "Failed to process contact request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/user", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        console.log("Delete attempt without authentication");
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Get the target user ID from the query params
      const targetUserId = Number(req.query.userId) || req.user.id;

      // Only allow deletion if:
      // 1. User is deleting their own account OR
      // 2. The request is from masteradmin123
      if (targetUserId !== req.user.id &&
          !(req.user.username === "masteradmin123" && req.user.adminType === "master_admin")) {
        console.log("Unauthorized deletion attempt:", {
          requestingUser: req.user.username,
          targetUserId,
          adminType: req.user.adminType
        });
        return res.status(403).json({
          message: "Only masteradmin123 or the user themselves can delete an account",
          code: "UNAUTHORIZED_DELETION"
        });
      }

      // Prevent deletion of master admin account
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser?.username === "masteradmin123") {
        console.log("Attempted to delete masteradmin123 account:", targetUserId);
        return res.status(403).json({
          message: "The masteradmin123 account cannot be deleted",
          code: "MASTER_ADMIN_DELETION_FORBIDDEN"
        });
      }

      console.log("Deleting user account:", targetUserId);

      // Delete the user
      await storage.deleteUser(targetUserId);

      // If user is deleting their own account, destroy the session
      if (targetUserId === req.user.id) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({
              message: "Error during logout",
              code: "SESSION_DESTROY_ERROR"
            });
          }
          res.clearCookie('sessionId').sendStatus(200);
        });
      } else {
        // If masteradmin123 is deleting another user
        res.sendStatus(200);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Failed to delete account",
        error: error instanceof Error ? error.message : String(error),
        code: "DELETE_ACCOUNT_ERROR"
      });
    }
  });

  // Add new PATCH endpoint for updating user profile
  app.patch("/api/user", requireAuth, async (req, res) => {
    try {
      console.log("Update profile request:", req.body);

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Validate request data
      const validatedData = updateProfileSchema.parse(req.body);
      console.log("Validated profile data:", validatedData);

      // Update user profile
      const updatedUser = await storage.updateUser(req.user.id, validatedData);
      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Update session with new user data
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("Session update error:", err);
          return res.status(500).json({
            message: "Failed to update session",
            code: "SESSION_UPDATE_ERROR"
          });
        }
        console.log("Profile updated successfully for user:", updatedUser.id);
        res.json(updatedUser);
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : String(error),
        code: "UPDATE_PROFILE_ERROR"
      });
    }
  });

  // Get products by seller ID
  app.get("/api/products/seller/:id", requireAuth, async (req, res) => {
    try {
      const sellerId = Number(req.params.id);
      const products = await storage.getProductsBySellerId(sellerId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching seller products:", error);
      res.status(500).send("Failed to fetch seller products");
    }
  });

  // Update register route to handle master admin creation
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt for:", req.body.username);

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
          code: "USERNAME_EXISTS"
        });
      }

      // Special handling for master admin
      if (req.body.username === "masteradmin123") {
        const user = await storage.createUser({
          ...req.body,
          roles: ["master_admin"],
          adminType: "master_admin",
          adminStatus: "approved"
        });

        console.log("Serializing master admin user:", user.id);
        req.login(user, (err) => {
          if (err) return next(err);
          console.log("Master admin registered and logged in:", user.id);
          res.status(201).json(user);
        });
        return;
      }

      // Normal user registration
      const user = await storage.createUser({
        ...req.body,
        roles: req.body.roles || ["buyer"],
      });

      req.login(user, (err) => {
        if (err) return next(err);
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

  const httpServer = createServer(app);
  return httpServer;
}