const Discord = require('discord.js');
const fs = require('fs');

module.exports = {
    execute(message) {

        if(!fs.existsSync(`./data/xp/${message.author.id}.json`)) {
            data = {
                m: 1,
            }
            fs.writeFileSync(`./data/xp/${message.author.id}.json`, JSON.stringify(data, null, 4), err => {
                console.log(err);
            });
        } else {

            data = JSON.parse(fs.readFileSync(`./data/xp/${message.author.id}.json`));
            data.m += 1;

            fs.writeFileSync(`./data/xp/${message.author.id}.json`, JSON.stringify(data, null, 4), err => {
                console.log(err);
            });
        }
    }
}