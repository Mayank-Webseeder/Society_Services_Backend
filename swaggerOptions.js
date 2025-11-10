const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Velnor API",
      version: "1.0.0",
      description: "API documentation for Society Services and Vendor Jobs",
    },
    servers: [
      { url: "http://localhost:3000" }, // matches your running server
      // you can add production server here if needed
      { url: "https://api.mysocietyneeds.com" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
