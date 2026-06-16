// server.js - Otak MYCLIPS Store
require("dotenv").config();
const express = require("express");
const midtransClient = require("midtrans-client");
const inviteCanva = require("./invite-canva"); // Robot undangan
const app = express();
app.use(express.json());

// 🔑 Ambil kunci dari environment variable (aman)
const {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_CLIENT_KEY,
  CANVA_EMAIL,
  CANVA_PASSWORD,
  PORT
} = process.env;

// 📋 Database order darurat (ganti dengan database beneran kalau sudah besar)
const orders = [];

// 💳 Setup Midtrans
const snap = new midtransClient.Snap({
  isProduction: false, // false = sandbox (latihan)
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// 📨 Endpoint: buat transaksi (dipanggil frontend)
app.post("/api/buat-transaksi", async (req, res) => {
  try {
    const { product, package, email, price } = req.body;
    const orderId = "MYCLIPS-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

    // Simpan data order
    const newOrder = {
      id: orderId,
      product,
      package,
      email,
      price,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    orders.push(newOrder);

    // Parameter untuk Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(price),
      },
      customer_details: {
        email: email,
      },
    };

    // Minta token Snap ke Midtrans
    const transaction = await snap.createTransaction(parameter);
    console.log(`✅ Transaksi dibuat: ${orderId}`);
    res.json({ token: transaction.token, order_id: orderId });
  } catch (error) {
    console.error("❌ Gagal buat transaksi:", error);
    res.status(500).json({ error: "Gagal buat transaksi" });
  }
});

// 📥 Webhook: dikabari Midtrans ketika pembayaran sukses/gagal
app.post("/api/notifikasi", async (req, res) => {
  try {
    const notif = req.body;
    console.log("📨 Notifikasi masuk:", JSON.stringify(notif, null, 2));

    const orderId = notif.order_id;
    const transactionStatus = notif.transaction_status;
    const fraudStatus = notif.fraud_status;

    // Cari order kita
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      console.log(`⚠️ Order ${orderId} tidak ditemukan.`);
      return res.status(200).json({ status: "ok" }); // tetap jawab ok agar Midtrans tidak kirim ulang
    }

    // Cek apakah pembayaran sukses
    if (transactionStatus === "capture" && fraudStatus === "accept") {
      order.status = "lunas";
      console.log(`💰 Pembayaran LUNAS: ${orderId}`);

      // 🤖 Jalankan robot undangan Canva
      await inviteCanva(order.email);
      console.log(`🎉 Undangan Canva terkirim ke ${order.email}`);

      // (Opsional) Kirim email pemberitahuan ke pembeli
      // kirimEmail(order.email, "Canva Premium kamu sudah aktif!");
    } else if (transactionStatus === "settlement") {
      order.status = "lunas";
      console.log(`💰 Pembayaran LUNAS (settlement): ${orderId}`);
      await inviteCanva(order.email);
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      order.status = "gagal";
      console.log(`❌ Pembayaran gagal: ${orderId}`);
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("❌ Error di webhook:", error);
    res.status(200).json({ status: "ok" }); // tetap 200 biar Midtrans nggak retry
  }
});

// 🌐 Jalankan server
const port = PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server MYCLIPS berjalan di port ${port}`);
});