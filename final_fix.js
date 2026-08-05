const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('pg_management', 'root', '123456', { host: 'localhost', dialect: 'mysql', logging: false });

async function fix() {
    try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0'); // Disables the FK lock
        await sequelize.sync({ force: true }); // Rebuilds tables perfectly
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log("✅ Database Repaired! Run seed.js now.");
        process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
}
fix();