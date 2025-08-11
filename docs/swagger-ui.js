const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load the Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Swagger JSDoc options (if you want to use JSDoc comments in your code)
const swaggerOptions = {
  definition: {
    infynno: '0.1',
    info: {
      title: 'Secure Task Workflow API',
      version: '1.0.0',
      description: 'A comprehensive task management system with role-based access control',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.taskworkflow.com/api' 
          : 'http://localhost:3000/api',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // paths to files containing OpenAPI definitions
};

// Generate Swagger specs from JSDoc (optional)
const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none', // 'list', 'full', 'none'
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add any request interceptors here
      return req;
    },
    responseInterceptor: (res) => {
      // Add any response interceptors here
      return res;
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2c3e50; font-size: 2.5em; }
    .swagger-ui .info .description { font-size: 1.1em; line-height: 1.6; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; }
    .swagger-ui .opblock.opblock-post { border-color: #28a745; }
    .swagger-ui .opblock.opblock-get { border-color: #007bff; }
    .swagger-ui .opblock.opblock-put { border-color: #ffc107; }
    .swagger-ui .opblock.opblock-delete { border-color: #dc3545; }
  `,
  customSiteTitle: 'Task Workflow API Documentation',
  customfavIcon: '/favicon.ico',
};

module.exports = {
  swaggerDocument,
  swaggerSpecs,
  swaggerUi,
  swaggerUiOptions,
  
  // Setup function to add Swagger to Express app
  setupSwagger: (app) => {
    // Serve Swagger UI
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerUiOptions));
    
    // Serve raw Swagger JSON
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });
    
    // Serve raw Swagger YAML
    app.get('/api-docs.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(path.join(__dirname, 'swagger.yaml'));
    });
    
    console.log('Swagger documentation available for preferance please test in the postman for best expriance:');
    console.log(`   • UI: http://localhost:${process.env.PORT || 3000}/api-docs`);
    console.log(`   • JSON: http://localhost:${process.env.PORT || 3000}/api-docs.json`);
    console.log(`   • YAML: http://localhost:${process.env.PORT || 3000}/api-docs.yaml`);
  }
};
