require('dotenv').config();
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
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL;

let watchlist = new Collection();

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

// Tää funktio lähettää alert-viestin jne
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

    await alertChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error viestin lähetyksessä:", err);
  }
}

// Näyttää logeihin et homma rokkaa
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await scanWatchlist();

  // Skannaa kaikki nykyiset jäsenet
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch(); // Hakee kaikki jäsenet cacheen

  guild.members.cache.forEach(member => {
    checkMemberAgainstWatchlist(member);
  });

  // Skannaa watchlistiä minuutin välein
  setInterval(scanWatchlist, 1 * 60 * 1000);
});

// Watchlistin skannausmekanismi:
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

// Kun uus hessu saapuu:
client.on("guildMemberAdd", async (member) => {
  checkMemberAgainstWatchlist(member);
});

// Kun lisätää watchlistille uus nimi niin botti tekee seuraavan:
client.on("messageCreate", async (message) => {
  if (message.channel.id === WATCHLIST_CHANNEL_ID && !message.author.bot) {
    const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
    if (cleaned.length === 0) return;

    watchlist.set(message.id, cleaned);
    console.log(`Uusi nimi lisätty watchlistille: "${cleaned}"`);

    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    guild.members.cache.forEach(member => {
      checkMemberAgainstWatchlist(member);
    });
  }
});

client.login(process.env.TOKEN);
