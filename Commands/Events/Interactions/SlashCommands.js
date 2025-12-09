const { ChatInputCommandInteraction } = require("discord.js")

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     */
    execute(interaction, client) {
        if(!interaction.isChatInputCommand()) return

        const command = client.commands.get(interaction.commandName)
        if(!command)
        return interaction.reply({
            content: "Tämä komento on vanhentunut.",
            ephemeral: true
        })


        /*if(interaction.user.id !== "329329107148210177") 
        return interaction.reply({
            content: "Tämä komento on toistaiseksi käytössä vain kehittäjälle.",
            ephemeral: true
        })*/

        command.execute(interaction, client)
    }
}
