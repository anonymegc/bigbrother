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
const GUILD_ID = process.env.GUILD_ID;

let watchlist = new Collection();

// Tää alla oleva functio tsekkaa näit watchlistil olevii idiootteja:
async function checkMemberAgainstWatchlist(member) {
  const joinedName = member.user.username.toLowerCase();
  const joinedTag = member.user.tag.toLowerCase();
  const joinedId = member.id;

  for (const entry of watchlist.values()) {
    if (entry.includes(joinedName) || entry.includes(joinedTag) || entry.includes(joinedId)) {
      await sendAlert(member, entry);
      break;
    }
  }
}

// Tää functio kattoo et jos tulee BINGO ni pistää viestiä asiaan
async function sendAlert(member, matchedWord) {
  try {
    const alertChannel = await client.channels.fetch(ALERT_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ NÄÄTÄ HAVAITTU!")
      .setColor(0xFF0000)
      .setDescription(`Jäsen vastaa watchlistissä olevaa tietoa`)
      .addFields(
        { name: "👤 Käyttäjä", value: `${member.user.tag} (ID: ${member.id})` },
        { name: "🔍 Watchlist-osuma", value: matchedWord }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    alertChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error viestin lähetyksessä:", err);
  }
}

// Ready-event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await scanWatchlist();

  // Skannaa kaikki nykyiset jäsenet
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch(); // hakee kaikki jäsenet välimuistiin

  guild.members.cache.forEach(member => {
    checkMemberAgainstWatchlist(member);
  });

  setInterval(scanWatchlist, 1 * 60 * 1000); // skannaa watchlistillä olevat viestit minuutin välein
});

// Watchlistin skannaus
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

// Uuden jäsenen liittyessä servulle:
client.on("guildMemberAdd", async (member) => {
  checkMemberAgainstWatchlist(member);
});

client.login(process.env.TOKEN);
