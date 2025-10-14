import sampleModuleRoutes from '@modules/sample-module/server/routes/sampleModuleRoutes';
import express from "express";
import fileUpload from "express-fileupload";
import { rateLimit } from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import ViteExpress from "vite-express";
import authRoutes from "./routes/auth/auth";
import departmentRoutes from "./routes/demo/department";
import moduleAuthorizationRoutes from "./routes/system/moduleAuthorization";
import moduleRegistryRoutes from "./routes/system/moduleRegistry";
import optionRoutes from "./routes/system/option";
import permissionRoutes from "./routes/system/permission";
import roleRoutes from "./routes/system/role";
import tenantRoutes from "./routes/system/tenant";
import userRoutes from "./routes/system/user";


const app = express();

// Trust proxy for Replit environment
app.set('trust proxy', true);

// rate limiter
const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 5000, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
        standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
        // store: ... , // Redis, Memcached, etc. See below.
})
app.use(limiter);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// misc middleware
app.use(fileUpload())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // Specify OpenAPI version
    info: {
      title: 'React Admin API',
      version: '1.0.0',
      description: 'API documentation for react admin application',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Replace with your API base URL
        description: 'Development server',
      },
    ],
    // Add security schemes, components (schemas), etc. here if needed
  },
  // Path to your route files where JSDoc comments are located
  apis: [
    './src/server/routes/*/*.ts',
    './src/modules/*/server/routes/*.ts',
  ], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// auth routes
app.use('/api/auth', authRoutes);

// system routes
app.use('/api/system/permission', permissionRoutes);
app.use('/api/system/role', roleRoutes);
app.use('/api/system/tenant', tenantRoutes);
app.use('/api/system/option', optionRoutes);
app.use('/api/system/user', userRoutes);
app.use('/api/system/module-authorization', moduleAuthorizationRoutes);
app.use('/api/system/module-registry', moduleRegistryRoutes);

// demo routes
app.use('/api/demo/department', departmentRoutes);

// sample module routes
app.use('/api/modules/sample-module', sampleModuleRoutes);

ViteExpress.listen(app, 5000, () =>
  console.log("Server is listening on port 5000..."),
);
