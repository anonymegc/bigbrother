const { ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    Client} = require("discord.js")
const { loadCommands } = require("../../Handlers/commandHandler")
const { loadEvents } = require("../../Handlers/eventHandler")
module.exports = {
    data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Käynnistää komennot/tapahtumat uudestaan.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((options) => options
    .setName("kategoria")
    .setDescription("Valitse haluatko käynnistää komennot vai tapahtumat uudelleen.")
    .setRequired(true)
    .addChoices(
        { name: "Tapahtumat", value: "events"},
        { name: "Komennot", value: "commands"}
    )),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const subCommand = interaction.options.getString("kategoria")
        
        switch(subCommand) {
            case "events" : {
                for (const [key, value] of client.events)
                client.removeAllListeners(`${key}`, value, true)
                loadEvents(client)
                interaction.reply({content: "Tapahtumat käynnistetty uudelleen", ephemeral: true})
            }
            break
            case "commands" : {
                await loadCommands(client)
                try {
                    interaction.reply({content: "Komennot käynnistetty uudelleen", ephemeral: true})
                } catch (error) {
                    console.log(error)
                }
            }
            break
        }
    }
}
