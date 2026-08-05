const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('pg_management', 'root', '123456', { host: 'localhost', dialect: 'mysql', logging: false });

async function repair() {
    try {
        console.log("🛠️  Bypassing locks and repairing tables...");
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0'); // Fixes FK lock error
        await sequelize.sync({ force: true }); // Rebuilds missing columns
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log("✅ Database Ready! Now run node seed.js");
        process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
}
repair();