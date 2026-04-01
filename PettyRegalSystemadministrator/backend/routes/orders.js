const express = require('express');
const fetch = require('node-fetch');
const pool = require('../db');

const router = express.Router();

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data.description);
  } catch (err) {
    console.error('Telegram send failed:', err.message);
  }
}

router.post('/', async (req, res) => {
  const { firstName, lastName, phone, address, wilaya, commune, items, total } = req.body;

  if (!firstName || !lastName || !phone || !address || !wilaya || !commune || !items || items.length === 0) {
    return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO orders (first_name, last_name, phone, address, wilaya, commune, items, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [firstName, lastName, phone, address, wilaya, commune, JSON.stringify(items), parseFloat(total)]
    );

    const order = result.rows[0];
    const orderNumber = `RS${String(order.id).padStart(5, '0')}`;

    const fmt = (n) => Math.round(parseFloat(n)).toLocaleString('ar-DZ');

    const itemLines = items
      .map(i => `  • ${i.name} — مقاس ${i.size} × ${i.qty} = <b>${fmt(parseFloat(i.price) * i.qty)} دج</b>`)
      .join('\n');

    const message =
      `🛍 <b>طلب جديد — ${orderNumber}</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>الاسم:</b> ${firstName} ${lastName}\n` +
      `📞 <b>الهاتف:</b> ${phone}\n` +
      `📍 <b>العنوان:</b> ${address}، ${commune}، ${wilaya}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🧾 <b>المنتجات:</b>\n${itemLines}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>المجموع:</b> ${fmt(total)} دج\n` +
      `🕐 <b>التوقيت:</b> ${new Date(order.created_at).toLocaleString('ar-DZ')}`;

    await sendTelegramMessage(message);

    res.status(201).json({ success: true, orderNumber });
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'حدث خطأ في معالجة الطلب' });
  } finally {
    client.release();
  }
});

module.exports = router;
