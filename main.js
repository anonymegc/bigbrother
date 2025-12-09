const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js')
const { loadEvents } = require("./Handlers/eventHandler")
const config = require('./config.json')

// Client configuraatio, kaikki tarvittavat intentit ja partialit
const client = new Client({
    intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.Reaction, Partials.ThreadMember]
})

// Exportataan client, jotta sitä voidaan käyttää muissa tiedostoissa (Onko välttämätöntä?)
module.exports = client

// Virheiden käsittely
const process = require("node:process")
process.on("unhandledRejection", (reason, promise) => {
  console.error("Error | ", promise, "Syy | ", reason)
})
process.on('uncaughtException', (error) => {
  console.error('Unhandled Exception:', error)
})

// Luodaan kokoelmat eventeille ja komennoille
client.events = new Collection()
client.commands = new Collection()

// Ladataan eventit
loadEvents(client)

// Kirjaudutaan Discordiin botin tokenilla
client.login(config.token)
