const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Api",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"], 
};

module.exports = swaggerJsdoc(options);
