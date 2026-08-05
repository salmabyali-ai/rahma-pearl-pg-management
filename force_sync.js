const { Sequelize } = require('sequelize');

// Database configuration - matching your credentials
const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log 
});

async function repairDatabase() {
    try {
        console.log("⚠️  Starting Database Repair (Force Sync)...");
        
        // 1. Disable Foreign Key checks so we can drop/alter locked tables
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // 2. Force drop and recreate all tables based on your CURRENT models
        // This fixes the ER_FK_COLUMN_CANNOT_CHANGE and ER_BAD_FIELD_ERROR
        await sequelize.sync({ force: true });
        
        // 3. Re-enable safety checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log("✅ SUCCESS: Database structure is now clean and fully updated!");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR during repair:", err);
        process.exit(1);
    }
}

repairDatabase();