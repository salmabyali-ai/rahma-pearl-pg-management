const mysql = require("mysql2");

const db = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"123456",
  database:"pg_management"
});

db.connect((err)=>{
 if(err) throw err;
 console.log("MySQL Connected");
});

module.exports = db;