const { SlashCommandBuilder } = require("discord.js");
const ticket = require("../../Functions/ticket");
const config = require("../../config.json"); // Lisätään roolit configiin

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lisää")
        .setDescription("Lisää käyttäjä ticketiin")
        .addUserOption(option => 
            option.setName("käyttäjä")
                  .setDescription("Käyttäjä lisättäväksi ticketiin")
                  .setRequired(true)
        ),
    
    async execute(interaction) {
        const member = interaction.options.getMember("käyttäjä");

        if (!member) {
            return interaction.reply({ content: "Käyttäjää ei löytynyt.", ephemeral: true });
        }

        // Roolitarkistus: vain tiettyjen roolien käyttäjät voivat käyttää komentoa
        const allowedRoles = [
            config.roleYllapito,   // esim. "Ylläpito"-roolin ID
            config.roleValvoja     // esim. "Valvoja"-roolin ID
        ];

        const hasRole = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));
        if (!hasRole) {
            return interaction.reply({ content: "Sinulla ei ole lupaa käyttää tätä komentoa.", ephemeral: true });
        }

        // Kutsutaan ticket-moduulin addMember funktiota
        try {
            await ticket.addMember(interaction, member);
        } catch (err) {
            console.error("Virhe lisää-komennossa:", err);
            interaction.reply({ content: "Tapahtui virhe käyttäjän lisäämisessä.", ephemeral: true });
        }
    }
}
