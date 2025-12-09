const { SlashCommandBuilder } = require("discord.js");
const ticket = require("../../Functions/ticket");
const config = require("../../config.json"); // Lisätään roolit configiin

module.exports = {
    data: new SlashCommandBuilder()
        .setName("poista")
        .setDescription("Poistaa käyttäjän ticketistä")
        .addUserOption(option => 
            option.setName("käyttäjä")
                  .setDescription("Käyttäjä poistettavaksi ticketistä")
                  .setRequired(true)
        ),
    
    async execute(interaction) {
        const member = interaction.options.getMember("käyttäjä");

        if (!member) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt.", ephemeral: true });
        }

        // Roolitarkistus: vain tiettyjen roolien käyttäjät voivat käyttää komentoa
        const allowedRoles = [
            config.ticket.roleYllapito,
            config.ticket.roleValvoja
        ];

        const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
        if (!hasRole) {
            return interaction.reply({ content: "Sinulla ei ole lupaa käyttää tätä komentoa.", ephemeral: true });
        }

        // Kutsutaan ticket-moduulin removeMember funktiota
        try {
            await ticket.removeMember(interaction, member);
        } catch (err) {
            console.error("Virhe poista-komennossa:", err);
            interaction.reply({ content: "Tapahtui virhe käyttäjän poistamisessa.", ephemeral: true });
        }
    }
}
