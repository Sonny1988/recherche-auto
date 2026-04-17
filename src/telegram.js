import TelegramBot from 'node-telegram-bot-api';

let bot;

function getBot() {
  if (!bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
  }
  return bot;
}

function formatAlert(v) {
  const emoji = v.type === 'camping-car' ? '🚐' : '🚗';
  const lines = [
    `${emoji} *${v.score_label}* — Arbitrage FR→DE`,
    ``,
    `*${v.titre}*`,
    `📍 ${v.localisation}`,
    ``,
    `💰 Prix FR: *${v.prix_fr?.toLocaleString('fr-FR')}€*`,
    `🇩🇪 Référence DE: *${v.prix_de_ref?.toLocaleString('fr-FR')}€*`,
    `📈 Profit brut: *+${v.profit_brut?.toLocaleString('fr-FR')}€* (+${v.delta_pct}%)`,
    `⚙️ Coûts export: ~${v.couts_export?.toLocaleString('fr-FR')}€`,
    ``,
    v.annee ? `📅 ${v.annee}` : '',
    v.km ? `🔢 ${v.km?.toLocaleString('fr-FR')} km` : '',
    v.carburant ? `⛽ ${v.carburant}` : '',
    ``,
    `🔗 [Voir l'annonce](${v.lien})`,
    `📊 [Référence AutoScout24](${v.url_de_ref})`,
  ].filter(l => l !== '').join('\n');

  return lines;
}

export async function sendAlert(vehicule) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const message = formatAlert(vehicule);
  try {
    await getBot().sendMessage(chatId, message, { parse_mode: 'Markdown', disable_web_page_preview: false });
    console.log(`[Telegram] Alerte envoyée: ${vehicule.titre}`);
  } catch (err) {
    console.error(`[Telegram] Erreur: ${err.message}`);
  }
}

export async function sendSummary(stats, topDeals) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const lines = [
    `🔍 *Scan arbitrage terminé*`,
    ``,
    `📋 ${stats.total} annonces analysées`,
    `✅ ${stats.opportunities} opportunités trouvées`,
    `📥 ${stats.created} nouvelles | 🔄 ${stats.updated} mises à jour`,
    ``,
    topDeals.length ? `*Top 3 deals :*` : `_Aucune opportunité ce scan._`,
  ];

  topDeals.slice(0, 3).forEach((v, i) => {
    lines.push(`${i + 1}. ${v.score_label} | ${v.titre?.slice(0, 40)} | +${v.profit_brut?.toLocaleString('fr-FR')}€`);
  });

  try {
    await getBot().sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`[Telegram] Erreur summary: ${err.message}`);
  }
}
