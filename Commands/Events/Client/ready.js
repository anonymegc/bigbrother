const { loadCommands } = require("../../Handlers/commandHandler")

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        try {
            await loadCommands(client)
            console.log(`Kirjauduttu sisään: ${client.user.tag}`)
        } catch (error) {
            console.error("Error loading commands:", error)
        }
    }
}
