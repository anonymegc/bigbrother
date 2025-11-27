require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await scanWatchlist();

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();

  // Tarkistetaan kaikki nykyiset jäsenet heti alussa
  await Promise.all(guild.members.cache.values().map(member => checkMemberAgainstWatchlist(member)));
});

// Tarkistetaan kaikki jäsenet rinnakkain
  await Promise.all(guild.members.cache.values().map(member => checkMemberAgainstWatchlist(member)));
});

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

let watchlist = new Set();
let alreadyAlerted = new Set();

// ------------------------
// ALERTTI
// ------------------------
async function sendAlert(member, matchedWord) {
  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("⚠️ NÄÄTÄ HAVAITTU!")
      .setColor(0xFF0000)
      .setDescription("Jäsen vastaa watchlistissä olevaa tietoa")
      .addFields(
        { name: "👤 Käyttäjä", value: `${member.user.tag} (ID: ${member.id})` },
        { name: "🔍 Watchlist-osuma", value: matchedWord }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error viestin lähetyksessä:", err);
  }
}

// ------------------------
// TARKISTUS
// ------------------------
async function checkMemberAgainstWatchlist(member) {
  const username = member.user.username.toLowerCase();
  const tag = member.user.tag.toLowerCase();
  const id = member.id;

  for (const entry of watchlist) {
    const key = `${id}-${entry}`;
    if (alreadyAlerted.has(key)) continue;

    if (
      entry.includes(id) ||
      entry.includes(username) ||
      entry.includes(tag)
    ) {
      await sendAlert(member, entry);
      alreadyAlerted.add(key);
    }
  }
}

// ------------------------
// WATCHLIST SKANNAUS
// ------------------------
async function scanWatchlist() {
  try {
    const channel = await client.channels.fetch(WATCHLIST_CHANNEL_ID);
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 100 });
    watchlist.clear();

    for (const msg of messages.values()) {
      const cleaned = msg.content.trim().toLowerCase().replace(/\s+/g, " ");
      if (cleaned.length > 0) watchlist.add(cleaned);
    }

    console.log("Watchlist päivitetty:", watchlist.size, "merkintää");
  } catch (err) {
    console.error("Error scanning watchlist:", err);
  }
}

// ------------------------
// JÄSEN LIITTYY
// ------------------------
client.on("guildMemberAdd", async (member) => {
  await checkMemberAgainstWatchlist(member);
});

// ------------------------
// UUSI NIMI WATCHLISTIIN
// ------------------------
client.on("messageCreate", async (message) => {
  if (message.channel.id !== WATCHLIST_CHANNEL_ID || message.author.bot) return;

  const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
  if (cleaned.length === 0) return;

  watchlist.add(cleaned);
  console.log(`Uusi watchlist-merkintä: "${cleaned}"`);

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();


client.login(process.env.TOKEN);
