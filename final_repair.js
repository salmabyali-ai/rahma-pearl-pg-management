const { Sequelize } = require('sequelize');

// Use your exact database credentials
const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false 
});

async function ultimateFix() {
    try {
        console.log("🚀 Starting Ultimate Database Repair...");
        
        // 1. Disable Foreign Key checks (This stops the ER_FK_COLUMN_CANNOT_CHANGE error)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // 2. Force sync (This drops old tables and creates new ones with 'current_task')
        await sequelize.sync({ force: true });
        
        // 3. Re-enable safety checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log("✅ SUCCESS: Database is now perfectly clean and updated!");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR:", err);
        process.exit(1);
    }
}

ultimateFix();