async function loadEvents(client) {
    const { loadFiles } = require("../Functions/fileLoader")
    const ascii = require("ascii-table")
    const table = new ascii().setHeading("Tapahtumat", "Status")

    await client.events.clear()
    await client.removeAllListeners()

    const Files = await loadFiles("Events")

    Files.forEach((file) => {
        const event = require(file)

        const execute = (...args) => event.execute(...args, client)
        client.events.set(event.name, execute)

        if(event.once){
            client.once(event.name, (...args) => execute(...args))
        } else {
            client.on(event.name, (...args) => execute(...args))
        }
        table.addRow(event.name, "🟩")
    })
    return console.log(table.toString(), "\nTapahtumat ladattu")
}

module.exports = { loadEvents }
