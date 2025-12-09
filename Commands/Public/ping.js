const { SlashCommandBuilder, ChatInputCommandInteraction, InteractionResponseFlags } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vastaa Pong!"),

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.reply({ 
      content: "Pong!", 
      flags: InteractionResponseFlags.Ephemeral 
    })
  },
}
