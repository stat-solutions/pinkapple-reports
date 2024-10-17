const { connect, connect2 } = require("./dbConnector");
const createError = require("http-errors");

exports.returnArray = function (payLoad) {
  return new Promise(function (resolve, next) {
    console.log(payLoad);
    connect.query(payLoad, null, function (error, results) {
      if (error) {
        next(createError.InternalServerError(error));
      } else {
        console.log(results[0]);
        resolve(results[0]);
      }
    });
  });
};



exports.returnArrayTenant = function (companyalias, payLoad) {
  return new Promise(async function (resolve, reject) {
    console.log(companyalias);
    console.log(payLoad);
    try {
      const theConn = await connect2(companyalias);
      theConn.query(payLoad, null, function (error, results) {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// exports.returnArrayTenant = function (companyalias, payLoad) {
//   return new Promise(async function (resolve, next) {
//     console.log(companyalias);
//     console.log(payLoad);
//     try {
//       const theConn = await connect2(companyalias);
//       theConn.query(payLoad, null, function (error, results) {
//         if (error) {
//           next(error);
//         } else {
//           resolve(results);
//         }
//       });
//     } catch (error) {
//       next(error);
//     }
//   });
// };

// exports.returnMultipleResults = function (payLoad) {
//   return new Promise(function (resolve, reject) {
//     console.log(payLoad);
//     connect.query(payLoad, null, function (error, results) {
//       if (error) {
//         reject(createError.InternalServerError(error));
//       } else {
//         resolve(results); // This will return all the result sets
//       }
//     });
//   });
// };

// exports.returnArrayTenant = function (companyalias, payLoad) {
//   return new Promise(async function (resolve, next) {
//     console.log(companyalias);
//     console.log(payLoad);
//     try {
//       const theConn = await connect2(companyalias);
//       theConn.query(payLoad, null, function (error, results) {
//         if (error) {
//           console.log(error);
//           next(createError.InternalServerError(error));
//         } else {
//           resolve(results[0]);
//         }
//       });
//     } catch (error) {
//       console.log(error);
//       next(createError.InternalServerError(error));
//     }
//   });
// };
