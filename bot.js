require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('❌ لازم تحط BOT_TOKEN بملف .env');
  process.exit(1);
}
if (!GROUP_CHAT_ID) {
  console.error('❌ لازم تحط GROUP_CHAT_ID بملف .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ---------- أنواع الخدمة ----------
const SERVICE_TYPES = [
  'تصميم موقع إلكتروني',
  'تصميم تطبيق (ويب / ديسكتوب)',
  'اشتراكات رقمية (ChatGPT, Canva...)',
  'شي تاني',
];

// ---------- خطوة 1: نوع الخدمة ----------
const serviceStep = new Scenes.BaseScene('SERVICE_STEP');

serviceStep.enter((ctx) => {
  ctx.reply(
    'أهلاً فيك 👋\nمشان نجهزلك عرض سعر مناسب، اختار نوع الخدمة يلي بتحتاجها:',
    Markup.inlineKeyboard(
      SERVICE_TYPES.map((t) => [Markup.button.callback(t, `SERVICE_${t}`)])
    )
  );
});

serviceStep.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chosen = SERVICE_TYPES.find((t) => `SERVICE_${t}` === data);
  if (!chosen) return ctx.answerCbQuery();

  ctx.scene.session.order = { serviceType: chosen };
  await ctx.answerCbQuery();
  await ctx.editMessageText(`✅ نوع الخدمة: ${chosen}`);
  return ctx.scene.enter('DESCRIPTION_STEP');
});

// ---------- خطوة 2: وصف المشروع ----------
const descriptionStep = new Scenes.BaseScene('DESCRIPTION_STEP');

descriptionStep.enter((ctx) => {
  ctx.reply('تمام 👌\nهلأ احكيلي بإيجاز شو فكرة مشروعك أو شو بتحتاج بالضبط؟');
});

descriptionStep.on('text', (ctx) => {
  ctx.scene.session.order.description = ctx.message.text;
  return ctx.scene.enter('BUDGET_STEP');
});

// ---------- خطوة 3: الميزانية ----------
const budgetStep = new Scenes.BaseScene('BUDGET_STEP');

budgetStep.enter((ctx) => {
  ctx.reply('آخر سؤال 💰\nشو الميزانية التقريبية يلي حاططها للمشروع؟ (تقريبية، ما لازم تكون دقيقة)');
});

budgetStep.on('text', async (ctx) => {
  ctx.scene.session.order.budget = ctx.message.text;
  const order = ctx.scene.session.order;
  const user = ctx.from;

  const summary =
    `📥 طلب جديد من قناة YK10 Software\n\n` +
    `👤 الاسم: ${user.first_name || ''} ${user.last_name || ''}\n` +
    `🆔 اليوزر: ${user.username ? '@' + user.username : 'ما في يوزر'}\n` +
    `🔢 آي دي: ${user.id}\n\n` +
    `🛠️ نوع الخدمة: ${order.serviceType}\n` +
    `📝 وصف المشروع: ${order.description}\n` +
    `💰 الميزانية التقريبية: ${order.budget}`;

  try {
    await bot.telegram.sendMessage(GROUP_CHAT_ID, summary);
  } catch (err) {
    console.error('خطأ بإرسال الطلب للمجموعة:', err.message);
  }

  await ctx.reply(
    '🎉 تمام! وصل طلبك لفريق YK10 Software وبنتواصل معك قريباً.\n' +
    'إذا بدك تضيف تفاصيل تانية أو صور، فيك ترسلهن هون مباشرة وبنشوفهن.'
  );

  return ctx.scene.leave();
});

// ---------- تجميع المشاهد ----------
const stage = new Scenes.Stage([serviceStep, descriptionStep, budgetStep]);

bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => ctx.scene.enter('SERVICE_STEP'));
bot.command('طلب', (ctx) => ctx.scene.enter('SERVICE_STEP'));
bot.command('order', (ctx) => ctx.scene.enter('SERVICE_STEP'));

bot.command('cancel', (ctx) => {
  if (ctx.scene) ctx.scene.leave();
  ctx.reply('تم إلغاء الطلب الحالي. لو بدك تبلش من جديد ابعت /start');
});

bot.catch((err, ctx) => {
  console.error('خطأ بالبوت:', err);
});

bot.launch().then(() => {
  console.log('✅ بوت YK10 Software شغال...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
