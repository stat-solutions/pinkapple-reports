require('dotenv').config({ path: './.env' });
const mysql = require('mysql2');
const NodeCache = require("node-cache");

const cache = new NodeCache();

const mainDbConfig = {
  host: process.env.HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PW,
  connectionLimit: process.env.DB_CONN_LIMMIT,
  database: process.env.DB_NAME,
  insecureAuth: process.env.DB_INSECURE,
};

// Helper function to log connection events
const logConnectionEvents = (connection, dbName) => {
  console.log(`${dbName} Connection established`);
  connection.on('error', (err) => {
    console.error(new Date(), `${dbName} MySQL error`, err.code);
  });
  connection.on('close', (err) => {
    console.error(new Date(), `${dbName} MySQL close`, err);
  });
};

// Create a promise-based connection pool for the main database
const connect = mysql.createPool(mainDbConfig).promise();
connect.on('connection', (connection) => logConnectionEvents(connection, 'Main DB'));

// Retrieve tenant DB configuration from main database
const getTenantDbConfig = async (companyAlias) => {
  return new Promise((resolve, reject) => {
    const tenantDetailsQuery = 'CALL getTenantDetails(?)';
    connect.query(tenantDetailsQuery, [companyAlias], (err, rows) => {
      if (err) {
        console.error(`Error getting tenant details for ${companyAlias}`, err);
        reject(err);
      } else if (rows[0] && rows[0].length === 0) {
        reject(new Error(`No tenant details found for alias ${companyAlias}`));
      } else {
        const tenantConfig = {
          host: rows[0][0].dbHostName,
          port: rows[0][0].dbPort,
          user: rows[0][0].dbUserName,
          password: rows[0][0].dbPassword,
          connectionLimit: rows[0][0].dbConnLimit,
          database: rows[0][0].dbName,
          insecureAuth: true,
        };
        console.log('Tenant database config:', tenantConfig);
        resolve(tenantConfig);
      }
    });
  });
};

// Create a tenant pool connection and cache it
const connect2 = async (companyAlias) => {
  const cacheKey = `pool_${companyAlias}`;
  const cachedPool = cache.get(cacheKey);

  if (cachedPool) {
    console.log('Retrieving cached pool connection...');
    return cachedPool;
  }

  const tenantDbConfig = await getTenantDbConfig(companyAlias);
  const pool = mysql.createPool(tenantDbConfig).promise();

  pool.on('connection', (connection) => logConnectionEvents(connection, 'Tenant DB'));
  
  console.log('Creating new pool connection...');
  cache.set(cacheKey, pool);
  console.log("Connected to tenant database:", tenantDbConfig.database);
  return pool;
};

module.exports = {
  connect,
  connect2,
};
