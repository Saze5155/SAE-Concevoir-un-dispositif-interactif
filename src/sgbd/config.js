const Sequelize = require("sequelize");

const myDB = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mariadb",
    port: process.env.DB_PORT,
    dialectOptions: {
      multipleStatements: true,
    },
    query: { raw: true }, // ← ajoute cette ligne
  }
);

module.exports = myDB;
