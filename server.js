require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const cors = require("cors");
const compression = require("compression");
const hpp = require("hpp");

const app = express();
const PORT = process.env.PORT || 3000;

// ============ SECURITY MIDDLEWARE ============

// Set security HTTP headers (with relaxed CSP for inline scripts in UI)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Enable CORS for all origins (public API)
app.use(cors());

// Serve static files from public directory
app.use(express.static("public"));

// Body parser with size limits to prevent large payload attacks
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Compress responses
app.use(compression());

// Global rate limiting - 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Stricter rate limiting for write operations - 30 requests per 15 minutes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many write operations from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ MONGODB CONNECTION ============

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/test-api-server";

console.log("🔄 Attempting to connect to MongoDB...");
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.log(
      "⚠️  Server will start but database operations will fail until MongoDB is running."
    );
    console.log(
      "💡 To fix: Start MongoDB with 'mongod' or update MONGODB_URI in .env"
    );
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

// ============ DYNAMIC SCHEMA SYSTEM ============

// Store for dynamic models
const dynamicModels = new Map();

// Get or create a dynamic model for a collection
function getDynamicModel(collectionName) {
  // Sanitize collection name
  const sanitizedName = collectionName.replace(/[^a-zA-Z0-9_-]/g, "");

  if (dynamicModels.has(sanitizedName)) {
    return dynamicModels.get(sanitizedName);
  }

  // Create a flexible schema that accepts any fields
  const dynamicSchema = new mongoose.Schema(
    {},
    {
      strict: false,
      timestamps: true,
      collection: sanitizedName,
    }
  );

  // Add text index for search functionality
  dynamicSchema.index({ "$**": "text" });

  const model = mongoose.model(sanitizedName, dynamicSchema);
  dynamicModels.set(sanitizedName, model);

  return model;
}

// ============ UTILITY FUNCTIONS ============

// Validate collection name
function isValidCollectionName(name) {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(name);
}

// Build query filters from query params
function buildQuery(queryParams) {
  const query = {};
  const options = {
    limit: 100, // Default limit
    skip: 0,
    sort: { createdAt: -1 },
  };

  for (const [key, value] of Object.entries(queryParams)) {
    if (key === "_limit") {
      options.limit = Math.min(parseInt(value) || 100, 1000); // Max 1000
    } else if (key === "_skip" || key === "_offset") {
      options.skip = Math.max(parseInt(value) || 0, 0);
    } else if (key === "_sort") {
      const sortOrder = value.startsWith("-") ? -1 : 1;
      const sortField = value.replace(/^-/, "");
      options.sort = { [sortField]: sortOrder };
    } else if (key === "_search") {
      query.$text = { $search: value };
    } else if (key.endsWith("_gte")) {
      const field = key.slice(0, -4);
      query[field] = { ...query[field], $gte: value };
    } else if (key.endsWith("_lte")) {
      const field = key.slice(0, -4);
      query[field] = { ...query[field], $lte: value };
    } else if (key.endsWith("_ne")) {
      const field = key.slice(0, -3);
      query[field] = { $ne: value };
    } else if (!key.startsWith("_")) {
      query[key] = value;
    }
  }

  return { query, options };
}

// ============ API ROUTES ============

// Root route - Dashboard UI
app.get("/", (req, res) => {
  // Check if request accepts HTML (browser) or wants JSON (API client)
  const acceptsHtml = req.accepts("html");
  const acceptsJson = req.accepts("json");

  if (acceptsHtml && !req.query.json) {
    // Serve the dashboard UI
    res.sendFile("index.html", { root: "./public" });
  } else {
    // Serve JSON API documentation
    res.json({
      message: "Welcome to Test API Server",
      version: "1.0.0",
      dashboard: `${req.protocol}://${req.get("host")}/`,
      documentation: {
        base_url: `${req.protocol}://${req.get("host")}`,
        endpoints: {
          list_collections: "GET /collections",
          get_all: "GET /:collection",
          get_one: "GET /:collection/:id",
          create: "POST /:collection",
          update: "PUT /:collection/:id",
          patch: "PATCH /:collection/:id",
          delete: "DELETE /:collection/:id",
          delete_all: "DELETE /:collection",
        },
        query_params: {
          _limit: "Limit results (max 1000, default 100)",
          _skip: "Skip results for pagination",
          _sort: "Sort by field (prefix with - for desc)",
          _search: "Full-text search",
          field_gte: "Greater than or equal",
          field_lte: "Less than or equal",
          field_ne: "Not equal",
          field: "Exact match",
        },
      },
    });
  }
});

// List all collections
app.get("/collections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."));

    res.json({
      count: collectionNames.length,
      collections: collectionNames,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// GET all documents from a collection
app.get("/:collection", async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!isValidCollectionName(collectionName)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    const Model = getDynamicModel(collectionName);
    const { query, options } = buildQuery(req.query);

    const documents = await Model.find(query)
      .limit(options.limit)
      .skip(options.skip)
      .sort(options.sort)
      .lean();

    const total = await Model.countDocuments(query);

    res.json({
      collection: collectionName,
      count: documents.length,
      total,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single document by ID
app.get("/:collection/:id", async (req, res) => {
  try {
    const { collection, id } = req.params;

    if (!isValidCollectionName(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const Model = getDynamicModel(collection);
    const document = await Model.findById(id).lean();

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Create new document
app.post("/:collection", writeLimiter, async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!isValidCollectionName(collectionName)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body cannot be empty" });
    }

    const Model = getDynamicModel(collectionName);
    const document = new Model(req.body);
    await document.save();

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Replace document (full update)
app.put("/:collection/:id", writeLimiter, async (req, res) => {
  try {
    const { collection, id } = req.params;

    if (!isValidCollectionName(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body cannot be empty" });
    }

    const Model = getDynamicModel(collection);
    const document = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      overwrite: true,
      runValidators: true,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH - Partial update
app.patch("/:collection/:id", writeLimiter, async (req, res) => {
  try {
    const { collection, id } = req.params;

    if (!isValidCollectionName(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body cannot be empty" });
    }

    const Model = getDynamicModel(collection);
    const document = await Model.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE single document
app.delete("/:collection/:id", writeLimiter, async (req, res) => {
  try {
    const { collection, id } = req.params;

    if (!isValidCollectionName(collection)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const Model = getDynamicModel(collection);
    const document = await Model.findByIdAndDelete(id);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ message: "Document deleted successfully", deleted: document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE all documents in collection
app.delete("/:collection", writeLimiter, async (req, res) => {
  try {
    const collectionName = req.params.collection;

    if (!isValidCollectionName(collectionName)) {
      return res.status(400).json({ error: "Invalid collection name" });
    }

    const Model = getDynamicModel(collectionName);
    const result = await Model.deleteMany({});

    res.json({
      message: "All documents deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log(`🚀 Test API Server running on port ${PORT}`);
  console.log(`📊 Dashboard UI: http://localhost:${PORT}/`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/?json`);
  console.log("=".repeat(60) + "\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  mongoose.connection.close(false, () => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});
