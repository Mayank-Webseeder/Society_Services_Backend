// swaggerOptions.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Velnor API',
      version: '1.0.0',
      description: 'API documentation for Society Services and Vendor Jobs',
    },
    servers: [
      {
        url: 'http://localhost:5003',
      },
    ],
  },
  apis: ['./routes/*.js'], // points to route files for annotations
};

module.exports = swaggerJSDoc(options);
