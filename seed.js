const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('pg_management', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false 
});

const Room = sequelize.define('Room', {
    room_number: { type: DataTypes.STRING, unique: true },
    capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
    occupied: { type: DataTypes.INTEGER, defaultValue: 0 },
    price: { type: DataTypes.INTEGER, defaultValue: 5500 }
});

const Staff = sequelize.define('Staff', {
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    role: DataTypes.STRING,
    current_task: { type: DataTypes.STRING, defaultValue: 'No active duty' }
});

async function runSeed() {
    try {
        await sequelize.sync();
        
        // Add Rooms
        for (let i = 101; i <= 110; i++) {
            await Room.findOrCreate({ 
                where: { room_number: `RM-${i}` },
                defaults: { capacity: 4, occupied: 0, price: 5500 }
            });
        }

        // Add Staff
        const staffData = [
            { name: "Anita Devi", phone: "9876543210", role: "Cleaning", current_task: "Floor 1" },
            { name: "Suresh Patil", phone: "9876543211", role: "Security", current_task: "Main Gate" },
            { name: "Meena K.", phone: "9876543212", role: "Kitchen", current_task: "Lunch Prep" },
            { name: "Rajesh Rao", phone: "9876543213", role: "Maintenance", current_task: "Plumbing" },
            { name: "Lata M.", phone: "9876543214", role: "Warden", current_task: "Check-in Desk" }
        ];

        for (let s of staffData) {
            await Staff.findOrCreate({ where: { name: s.name }, defaults: s });
        }

        console.log("✅ Seeding Complete: 10 Rooms & 5 Staff members added!");
        process.exit();
    } catch (err) {
        console.error("❌ Seed Error:", err);
        process.exit(1);
    }
}

runSeed();