const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log 
});

async function forceReset() {
    try {
        console.log("⚠️ Starting Database Force Reset...");
        
        // Disable foreign key checks to allow dropping tables safely
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // DROP all existing tables and RECREATE them from your models
        await sequelize.sync({ force: true });
        
        // Re-enable foreign key checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log("✅ SUCCESS: Database structure is now perfectly synced!");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR during reset:", err);
        process.exit(1);
    }
}

forceReset();