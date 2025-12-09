module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        const guild = member.guild
        const welcomeChannel = guild.channels.cache.get("924976921874423809")
        const welcomeRole = guild.roles.cache.get("861926084689002506")

        if (!welcomeChannel || !welcomeRole) {
            console.error("Welcome channel or role not found.")
            return
        }

        await welcomeChannel.send(`${member} liittyi Discordiin. Tervetuloa palvelimelle!`)

        try {
            await member.roles.add(welcomeRole)
        } catch (error) {
            console.error("Error adding welcome role:", error)
        }
    }
}
