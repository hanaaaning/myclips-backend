// invite-canva.js - Robot yang login Canva lalu invite email
const puppeteer = require("puppeteer");

async function inviteCanva(emailPembeli) {
  console.log(`🤖 Mulai mengundang ${emailPembeli} ke Canva...`);
  const browser = await puppeteer.launch({
    headless: "new", // biar nggak muncul jendela browser
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();

  try {
    // 1. Login Canva
    await page.goto("https://www.canva.com/login", { waitUntil: "networkidle2" });
    console.log("📄 Halaman login terbuka");

    // Isi email
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', process.env.CANVA_EMAIL, { delay: 50 });
    // Isi password
    await page.type('input[name="password"]', process.env.CANVA_PASSWORD, { delay: 50 });
    // Klik tombol login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("🔑 Berhasil login");

    // 2. Buka halaman anggota tim
    // Pastikan URL ini sesuai dengan tim Canva kamu. Ganti "nama-tim" dengan nama tim kamu.
    await page.goto("https://www.canva.com/your-team/members", { waitUntil: "networkidle2" });
    console.log("👥 Halaman anggota tim terbuka");

    // 3. Klik tombol "Undang orang" (selector bisa berubah, sesuaikan nanti)
    // Coba beberapa kemungkinan selector
    let inviteButton = await page.$('button:has-text("Undang")');
    if (!inviteButton) inviteButton = await page.$('span:has-text("Undang")');
    if (!inviteButton) inviteButton = await page.$('[aria-label="Undang orang"]');
    if (!inviteButton) inviteButton = await page.$('button:has-text("Invite")');
    if (inviteButton) {
      await inviteButton.click();
      console.log("✉️ Klik tombol undang");
    } else {
      throw new Error("Tombol undang tidak ditemukan. Mungkin Canva mengubah tampilan.");
    }

    // 4. Isi email pembeli
    await page.waitForSelector('input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 10000 });
    await page.type('input[placeholder*="email"], input[placeholder*="Email"]', emailPembeli, { delay: 30 });
    console.log(`📧 Isi email: ${emailPembeli}`);

    // 5. Klik kirim undangan
    let sendButton = await page.$('button:has-text("Kirim")');
    if (!sendButton) sendButton = await page.$('button:has-text("Send")');
    if (!sendButton) sendButton = await page.$('[aria-label="Kirim undangan"]');
    if (sendButton) {
      await sendButton.click();
      await page.waitForTimeout(3000); // tunggu sebentar sampai terkirim
      console.log("✅ Undangan terkirim!");
    } else {
      throw new Error("Tombol kirim undangan tidak ditemukan.");
    }
  } catch (error) {
    console.error("❌ Gagal mengundang:", error.message);
  } finally {
    await browser.close();
  }
}

module.exports = inviteCanva;