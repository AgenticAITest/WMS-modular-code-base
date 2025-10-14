#!/usr/bin/env node

/**
 * React Admin Module Registration Script
 * 
 * This script automatically registers an existing module by following the 4-step manual process:
 * 1. Register Client Routes (src/client/route.ts)
 * 2. Register Server Routes (src/server/main.ts) 
 * 3. Register Sidebar Menu (app-sidebar.tsx)
 * 4. Update Drizzle Schema Exports (if central schema exists)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Utility functions for string conversion
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase());
}

async function main() {
  console.log('\n🔧 React Admin Module Registration Script');
  console.log('==========================================\n');

  try {
    // List available modules
    const projectRoot = path.dirname(__dirname);
    const modulesDir = path.join(projectRoot, 'src', 'modules');
    const modules = fs.readdirSync(modulesDir).filter(item => 
      fs.statSync(path.join(modulesDir, item)).isDirectory() &&
      !['README.md', 'moduleHelpers.ts', 'moduleMetadata.ts'].includes(item)
    );

    if (modules.length === 0) {
      console.log('❌ No modules found to register!');
      process.exit(1);
    }

    console.log('Available modules:');
    modules.forEach((module, index) => {
      console.log(`${index + 1}. ${module}`);
    });

    // Get module selection
    const moduleIndex = parseInt(await askQuestion('\nSelect module number to register: ')) - 1;
    if (moduleIndex < 0 || moduleIndex >= modules.length) {
      console.error('❌ Invalid module selection!');
      process.exit(1);
    }

    const selectedModule = modules[moduleIndex];
    const moduleIdCamel = toCamelCase(selectedModule);
    const moduleIdPascal = toPascalCase(selectedModule);

    console.log(`\n📦 Registering module: ${selectedModule}`);
    console.log(`   Camel case: ${moduleIdCamel}`);
    console.log(`   Pascal case: ${moduleIdPascal}`);

    // Perform registration steps
    await registerModule(projectRoot, {
      moduleId: selectedModule,
      moduleIdCamel,
      moduleIdPascal
    });

    console.log('\n✅ Module registration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Check that routes are accessible');
    console.log('3. Verify API endpoints work');
    console.log('4. Test the UI navigation');
    console.log('5. Run database migrations if needed');

  } catch (error) {
    console.error('❌ Error registering module:', error.message);
    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Main registration function
async function registerModule(projectRoot, config) {
  console.log('\n🔄 Starting registration process...');
  
  // Step 1: Register Client Routes
  await registerClientRoutes(projectRoot, config);
  
  // Step 2: Register Server Routes
  await registerServerRoutes(projectRoot, config);
  
  // Step 3: Register Sidebar Menu
  await registerSidebarMenu(projectRoot, config);
  
  // Step 4: Update Drizzle Schema Exports
  await updateSchemaExports(projectRoot, config);
  
  console.log('✅ All registration steps completed');
}

// Step 1: Register Client Routes in src/client/route.ts
async function registerClientRoutes(projectRoot, config) {
  const routeFile = path.join(projectRoot, 'src', 'client', 'route.ts');
  
  if (!fs.existsSync(routeFile)) {
    console.log('⚠️  Client route file not found: src/client/route.ts');
    return;
  }

  let content = fs.readFileSync(routeFile, 'utf8');
  
  // Check if already registered
  if (content.includes(`${config.moduleIdCamel}ReactRoutes`)) {
    console.log('⚠️  Client routes already registered');
    return;
  }

  // Add import at the top
  const importLine = `import { ${config.moduleIdCamel}ReactRoutes } from '../modules/${config.moduleId}/client/routes/${config.moduleIdCamel}ReactRoutes';`;
  
  // Find last import and add after it
  const lastImportPattern = /(import.*from.*';)(?=\n)/g;
  const matches = [...content.matchAll(lastImportPattern)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const insertIndex = lastMatch.index + lastMatch[0].length;
    content = content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
  }

  // Add route in console children array
  const routeCall = `      ${config.moduleIdCamel}ReactRoutes("modules/${config.moduleId}"),`;
  
  // Find console children array and add route
  content = content.replace(
    /(path: "console",[\s\S]*?children: \[[\s\S]*?)(]\s*,)/,
    `$1      ${routeCall}\n$2`
  );

  fs.writeFileSync(routeFile, content);
  console.log('✅ Step 1: Client routes registered');
}

// Step 2: Register Server Routes in src/server/main.ts
async function registerServerRoutes(projectRoot, config) {
  const mainFile = path.join(projectRoot, 'src', 'server', 'main.ts');
  
  if (!fs.existsSync(mainFile)) {
    console.log('⚠️  Server main file not found: src/server/main.ts');
    return;
  }

  let content = fs.readFileSync(mainFile, 'utf8');
  
  // Check if already registered
  if (content.includes(`${config.moduleIdCamel}Routes`)) {
    console.log('⚠️  Server routes already registered');
    return;
  }

  // Add import at the top
  const importLine = `import ${config.moduleIdCamel}Routes from '../modules/${config.moduleId}/server/routes/${config.moduleIdCamel}Routes';`;
  
  // Find last import and add after it
  const lastImportPattern = /(import.*from.*';)(?=\n)/g;
  const matches = [...content.matchAll(lastImportPattern)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const insertIndex = lastMatch.index + lastMatch[0].length;
    content = content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
  }

  // Add route registration before ViteExpress.listen()
  const routeRegistration = `app.use('/api/modules/${config.moduleId}', ${config.moduleIdCamel}Routes);`;
  
  content = content.replace(
    /(ViteExpress\.listen)/,
    `// ${config.moduleId} routes\n${routeRegistration}\n\n$1`
  );

  fs.writeFileSync(mainFile, content);
  console.log('✅ Step 2: Server routes registered');
}

// Step 3: Register Sidebar Menu in components/app-sidebar.tsx
async function registerSidebarMenu(projectRoot, config) {
  const sidebarFile = path.join(projectRoot, 'src', 'client', 'components', 'app-sidebar.tsx');
  
  if (!fs.existsSync(sidebarFile)) {
    console.log('⚠️  Sidebar file not found: src/client/components/app-sidebar.tsx');
    return;
  }

  let content = fs.readFileSync(sidebarFile, 'utf8');
  
  // Check if already registered
  if (content.includes(`${config.moduleIdCamel}SidebarMenus`)) {
    console.log('⚠️  Sidebar menu already registered');
    return;
  }

  // Add import at the top
  const importLine = `import { ${config.moduleIdCamel}SidebarMenus } from "../../modules/${config.moduleId}/client/menus/sideBarMenus"`;
  
  // Find last import and add after it - handle both single and double quotes
  const lastImportPattern = /(import.*from.*["'];?)\s*$/gm;
  const matches = [...content.matchAll(lastImportPattern)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const insertIndex = lastMatch.index + lastMatch[0].length;
    content = content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
  } else {
    // Fallback: add after the last import line if pattern doesn't match
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && lines[i].includes('from')) {
        lastImportIndex = i;
      }
    }
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      content = lines.join('\n');
    }
  }

  // Add to navMain array - look for the specific pattern where sampleModuleSidebarMenus is added
  const sampleMenuPattern = /sampleModuleSidebarMenus,/;
  
  if (sampleMenuPattern.test(content)) {
    // Add the new menu right before sampleModuleSidebarMenus
    content = content.replace(
      /(\s+)(sampleModuleSidebarMenus,)/,
      `$1${config.moduleIdCamel}SidebarMenus,\n$1$2`
    );
    
    fs.writeFileSync(sidebarFile, content);
    console.log('✅ Step 3: Sidebar menu registered');
  } else {
    console.log('⚠️  Could not automatically add sidebar menu - please add manually');
    console.log(`   Import: ${importLine}`);
    console.log(`   Add to navMain array: ${config.moduleIdCamel}SidebarMenus,`);
  }
}

// Step 4: Update Drizzle Schema Exports (if central schema exists)
async function updateSchemaExports(projectRoot, config) {
  const schemaIndexFile = path.join(projectRoot, 'src', 'server', 'lib', 'db', 'schema', 'index.ts');
  
  if (!fs.existsSync(schemaIndexFile)) {
    console.log('⚠️  Central schema index file not found - skipping schema export update');
    return;
  }

  let content = fs.readFileSync(schemaIndexFile, 'utf8');
  
  // Check if already exported
  if (content.includes(`@modules/${config.moduleId}/server/lib/db/schemas`)) {
    console.log('⚠️  Schema already exported');
    return;
  }

  // Add schema export
  const exportLine = `export * from '@modules/${config.moduleId}/server/lib/db/schemas/${config.moduleIdCamel}';`;
  content += '\n' + exportLine;

  fs.writeFileSync(schemaIndexFile, content);
  console.log('✅ Step 4: Schema exports updated');
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { registerModule };