import sampleModuleRoutes from '@modules/sample-module/server/routes/sampleModuleRoutes';
import express from "express";
import fileUpload from "express-fileupload";
import { rateLimit } from 'express-rate-limit';
import path from "path";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import masterDataRoutes from '../modules/master-data/server/routes/masterDataRoutes';
import warehouseSetupRoutes from '../modules/warehouse-setup/server/routes/warehouseSetupRoutes';
import warehouseRoutes from '../modules/warehouse-setup/server/routes/warehouseRoutes';
import zoneRoutes from '../modules/warehouse-setup/server/routes/zoneRoutes';
import inventoryItemsRoutes from '../modules/inventory-items/server/routes/inventoryItemsRoutes';
import documentNumberConfigRoutes from '../modules/document-numbering/server/routes/documentNumberConfigRoutes';
import documentNumberGeneratorRoutes from '../modules/document-numbering/server/routes/documentNumberGeneratorRoutes';
import documentNumberHistoryRoutes from '../modules/document-numbering/server/routes/documentNumberHistoryRoutes';
import documentNumberTrackerRoutes from '../modules/document-numbering/server/routes/documentNumberTrackerRoutes';
import purchaseOrderRoutes from '../modules/purchase-order/server/routes/purchaseOrderRoutes';
import workflowRoutes from '../modules/workflow/server/routes/workflowRoutes';
import ViteExpress from "vite-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  definition: {
    openapi: '3.0.0', // Specify OpenAPI version
    info: {
      title: 'React Admin API',
      version: '1.0.0',
      description: 'API documentation for react admin application',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Replace with your API base URL
        description: 'Development server',
      },
    ],
    // Add security schemes, components (schemas), etc. here if needed
  },
  // Path to your route files where JSDoc comments are located - using absolute paths
  apis: [
    path.join(__dirname, './routes/**/*.ts'),
    path.join(__dirname, '../modules/**/server/routes/*.ts'),
  ], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/api-docs-json', (req, res) => {
  res.json(swaggerDocs);
});

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

// master-data routes
app.use('/api/modules/master-data', masterDataRoutes);

// warehouse-setup routes
app.use('/api/modules/warehouse-setup', warehouseSetupRoutes);
app.use('/api/modules/warehouse-setup', warehouseRoutes);
app.use('/api/modules/warehouse-setup', zoneRoutes);

// inventory-items routes
app.use('/api/modules/inventory-items', inventoryItemsRoutes);

// document-numbering routes
app.use('/api/modules/document-numbering', documentNumberConfigRoutes);
app.use('/api/modules/document-numbering', documentNumberGeneratorRoutes);
app.use('/api/modules/document-numbering', documentNumberHistoryRoutes);
app.use('/api/modules/document-numbering', documentNumberTrackerRoutes);

// purchase-order routes
app.use('/api/modules/purchase-order', purchaseOrderRoutes);

// workflow routes
app.use('/api/modules/workflow', workflowRoutes);

ViteExpress.listen(app, 5000, () =>
  console.log("Server is listening on port 5000..."),
);
