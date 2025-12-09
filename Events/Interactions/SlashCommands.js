const ticket = require("../../Functions/ticket");
const { ChatInputCommandInteraction } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     * @param {*} client
     */
    async execute(interaction, client) {
        try {
            // --- Ticket painikkeet ja dropdown ---
            await ticket.handleInteraction(interaction);

            // --- Chat-komennot ---
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) {
                return interaction.reply({
                    content: "Tämä komento on vanhentunut.",
                    ephemeral: true
                });
            }

            await command.execute(interaction, client);

        } catch (err) {
            console.error("Virhe interactionCreate-eventissä:", err);
        }
    }
}
