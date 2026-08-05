const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false 
});

async function runRepair() {
    try {
        console.log("🛠️  Resetting database structure...");
        // This disables the foreign key checks that cause ER_FK_COLUMN_CANNOT_CHANGE
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        // This drops the old tables and creates new ones with the 'current_task' field
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log("✅ Database structure is now clean and ready!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Repair failed:", err);
        process.exit(1);
    }
}

runRepair();