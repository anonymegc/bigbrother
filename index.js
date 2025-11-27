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

let watchlist = new Collection();
let alreadyAlerted = new Set(); // Pitää kirjaa jo lähetetyistä alert-viesteistä

// Tarkistaa jäsenen watchlistiä vastaan
async function checkMemberAgainstWatchlist(member) {
  const joinedName = member.user.username.toLowerCase();
  const joinedTag = member.user.tag.toLowerCase();
  const joinedId = member.id;

  for (const entry of watchlist.values()) {
    const key = `${joinedId}-${entry}`;
    if ((entry.includes(joinedName) || entry.includes(joinedTag) || entry.includes(joinedId))
        && !alreadyAlerted.has(key)) {
      await sendAlert(member, entry);
      alreadyAlerted.add(key);
    }
  }
}

// Alert-viestin lähetys
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

// Ready-event
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await scanWatchlist();

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();

  // Tarkistaa kaikki nykyiset jäsenet watchlistiä vastaan
  guild.members.cache.forEach(member => {
    checkMemberAgainstWatchlist(member);
  });

  // Päivittää watchlistiä minuutin välein
  setInterval(scanWatchlist, 1 * 60 * 1000);
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

// Kun uusi jäsen liittyy
client.on("guildMemberAdd", async (member) => {
  checkMemberAgainstWatchlist(member);
});

// Kun lisätään uusi nimi watchlistille
client.on("messageCreate", async (message) => {
  if (message.channel.id === WATCHLIST_CHANNEL_ID && !message.author.bot) {
    const cleaned = message.content.trim().toLowerCase().replace(/\s+/g, " ");
    if (cleaned.length === 0) return;

    watchlist.set(message.id, cleaned);
    console.log(`Uusi nimi lisätty watchlistille: "${cleaned}"`);

    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch();

    // Tarkistaa vain uuden watchlist-nimen
    guild.members.cache.forEach(member => {
      const key = `${member.id}-${cleaned}`;
      if ((cleaned.includes(member.user.username.toLowerCase())
           || cleaned.includes(member.user.tag.toLowerCase())
           || cleaned.includes(member.id))
          && !alreadyAlerted.has(key)) {
        sendAlert(member, cleaned);
        alreadyAlerted.add(key);
      }
    });
  }
});

client.login(process.env.TOKEN);
