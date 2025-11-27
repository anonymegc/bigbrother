require('dotenv').config();
require('./keepalive'); // Laitoin tän ihan vaan että renderin "Free tier" ei ota itteensä et on epäaktiivinen botti

const { Client, GatewayIntentBits, EmbedBuilder, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const WATCHLIST_CHANNEL_ID = process.env.WATCHLIST_CHANNEL_ID;
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;

let watchlist = new Collection();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  scanWatchlist();
  setInterval(scanWatchlist, 1 * 60 * 1000); // Skannaa listaa minuutin välein jotta jää näädät kiikkiin!
});

async function scanWatchlist() {
  try {
    const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 100 });

    watchlist.clear();

    messages.forEach(msg => {
      const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
      if (cleaned.length > 0) {
        watchlist.set(msg.id, cleaned);
      }
    });

    console.log("Watchlist päivitetty. Nimiä:", watchlist.size);
  } catch (err) {
    console.error("Error scanning watchlist:", err);
  }
}

client.on("guildMemberAdd", async (member) => {
  const joinedName = member.user.username.toLowerCase();
  const joinedTag = member.user.tag.toLowerCase();
  const joinedId = member.id;

  let matchFound = false;
  let matchedWord = null;

  for (const entry of watchlist.values()) {
    if (entry.includes(joinedName) || entry.includes(joinedTag) || entry.includes(joinedId)) {
      matchFound = true;
      matchedWord = entry;
      break;
    }
  }

  if (matchFound) {
    try {
      const alertChannel = await client.channels.fetch(ALERT_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Vastaavuus havaittu!")
        .setColor(0xFF0000)
        .setDescription(`Uusi jäsen vastaa watchlist-tietoa`)
        .addFields(
          { name: "👤 Käyttäjä", value: `${member.user.tag} (ID: ${member.id})` },
          { name: "🔍 Watchlist-osuma", value: matchedWord }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      alertChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error sending alert:", err);
    }
  }
});

client.login(process.env.TOKEN);
