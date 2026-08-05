const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log 
});

async function runRepair() {
    try {
        console.log("⚠️  Starting Database Repair (Force Sync)...");
        
        // 1. Disable Foreign Key checks to allow dropping locked tables
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // 2. Force drop and recreate all tables based on your CURRENT models
        // This creates the 'current_task' column and resets the 'room_number' constraint
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

runRepair();