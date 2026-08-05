const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("📱 Scan this QR with WhatsApp");
});

client.on("ready", () => {
    console.log("✅ WhatsApp connected");
});

client.initialize();

function sendWhatsApp(number, message) {
    const chatId = number + "@c.us";

    client.sendMessage(chatId, message)
        .then(() => console.log("Message sent to:", number))
        .catch(err => console.log("Error sending:", err));
}

module.exports = sendWhatsApp;