const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const RssFeedEmitter = require('rss-feed-emitter');
const { GiveawaysManager } = require('discord-giveaways');
const moment = require(`moment`);
const { msStore } = require('microsoft-store');
const store = new msStore();
const CronJob = require('cron').CronJob;

const { token, prefix, staffRoleID } = require('./data/config.json');
const inProgress = [];
const lb = require(`./system/lb`);
const levels = require(`./system/levels`);
const birthday1 = require(`./system/birthday`);

const manager = new GiveawaysManager(client, {
    storage: './data/giveaways.json',
    updateCountdownEvery: 2500,
    hasGuildMembersIntent: false,
    default: {
        botsCanWin: false,
        embedColor: '#FF0000',
        embedColorEnd: '#000000',
        reaction: '🤞'
    },
});
client.giveawaysManager = manager;

client.on("ready", () => {
    console.log(`--> Bot online`);
    require(`./system/rss`);

    const { birthdayRole, birthdayChannel } = require(`./data/config.json`);
    const formatYmd = date => date.toISOString().slice(0, 10);

    start = new CronJob('15 0 0 * * *', function() {
    
        // Remove roles
        client.guilds.cache.first().members.cache.forEach(member => {
            if(!member.roles.cache.get(birthdayRole)) return;
            member.roles.remove(birthdayRole);
        });

        // Announce todays birthday + add role
        files = fs.readdirSync(`./data/birthdays/`).filter(t => t.endsWith(`.json`));
        for(i in files) {
            birthday = JSON.parse(fs.readFileSync(`./data/birthdays/${files[i]}`)).birthday.split("-"); // mm-dd-yyyy
            dd = formatYmd(new Date()); // yyyy-mm-dd
            if(dd == `${new Date().getFullYear()}-${birthday[0]}-${birthday[1]}`) {
                member = client.guilds.cache.first().members.cache.get(files[i].split(".")[0]);
                if(member) {
                    member.roles.add(birthdayRole);
                    client.channels.cache.get(birthdayChannel).send(`Happy birthday <@${files[i].split(".")[0]}>! 🎉`);
                }
            }
        }

    }, null, true, 'Europe/London');
    start.start();
});
client.on("message", async message => {

    if(message.author.bot || message.guild == null) return;
    levels.execute(message);
    birthday1.execute(message, client);

    msg = message.content.toLowerCase();
    md = message.content.split(" ");

    if(msg == `${prefix}help`) {

        embed = new Discord.MessageEmbed()
            .setColor('DARK_BLUE')
            .setTitle(`Commands Summary`)
            .setFooter(message.guild.name, message.guild.iconURL())
            .addField(`${prefix}question`, `Asks a question to the group! Anyone can answer!`)
            .addField(`${prefix}giveaway [Time - e.g. 2h] [Winners - e.g. 5] [Prize]`, `Starts a giveaway. Staff only.`)
            .addField(`${prefix}info`, `Displays your information.`)
            .addField(`${prefix}info @user`, `Displays your friend's information.`)
            .addField(`${prefix}serverinfo`, `Displays the server's information - e.g. number of roles.`)
            .addField(`${prefix}colors`, `Brings up a list of roles to select from.`)
            .addField(`${prefix}colors [id]`, `Allows you to select a colorful role.`)
            .addField(`${prefix}search [query]`, `Searches the xbox store. It returns the top result.`)
            .addField(`${prefix}xp`, `Displays how much XP you have.`)
            .addField(`${prefix}leaderboard`, `Displays the top 10 users in terms of XP.`)
            .addField(`${prefix}give-xp @user [amount]`, `Allows staff to grant extra XP to users.`)
            .addField(`${prefix}remember-birthday [MM-DD-YYYY]`, `Remembers your birthday!`)
            .addField(`${prefix}forget-birthday`, `Clears your set birthday.`)
            .addField(`${prefix}birthday`, `Displays your birthday.`)
            .addField(`${prefix}birthday @user`, `Displays their birthday.`)
        message.channel.send(embed);

    }
    if(msg == `${prefix}question`) {

        // in progress?
        if(inProgress.length != 0) {
            message.reply("Answer the question in progress first!");
            return
        } 
        inProgress.push('md');

        // Get question + answer
        response = JSON.parse(fs.readFileSync(`./data/questions.json`))[Object.keys(JSON.parse(fs.readFileSync(`./data/questions.json`)))[ Object.keys(JSON.parse(fs.readFileSync(`./data/questions.json`))).length * Math.random() << 0]];
        
        // Store
        let question = response.A;
        let answer = response.B.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');     
        
        // Send
        embed = new Discord.MessageEmbed()
            .setTitle(`${question}`)
            .setColor('AQUA')
            .setDescription(`You have 20 seconds to guess the answer. **Go!**`)
        md = await message.channel.send(embed);

        // Collector
        let correct = [];
        const filter = m => m.channel.id == message.channel.id;
        const collector = message.channel.createMessageCollector(filter, { time: 20000 });

        collector.on('collect', m => {
            if(correct.length != 0) return;
            if(m.content.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') == answer) {
                correct.push('MD');
                inProgress.pop();
                m.react('⭐');

                embed = new Discord.MessageEmbed()
                    .setAuthor('🏆 Correct!')
                    .setDescription(`<@${m.author.id}> guessed correctly!`)
                    .setColor('#FDD017')
                message.channel.send(embed);

                collector.stop();
            };
        });

        collector.on('end', collected => {
            if(correct.length == 0) {
                inProgress.pop()
                embed = new Discord.MessageEmbed()
                    .setDescription(`No one guessed the correct answer! The answer was: **${response.B}**!`)
                    .setColor('RED')
                message.channel.send(embed);
            }
        });
    }
    if(msg.startsWith(`${prefix}giveaway`)) {
        if(!message.member.roles.cache.has(staffRoleID)) {
            embed = new Discord.MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`You are not authorised to use this command.`)
            message.channel.send(embed);
            return
        }

        client.giveawaysManager.start(message.channel, {
            time: ms(md[1]),
            winnerCount: parseInt(md[2]),
            prize: md.slice(3).join(' '),
            messages: {
                giveaway: '@everyone\n\n**GIVEAWAY!**',
                giveawayEnded: '',
                timeRemaining: 'Time remaining: **{duration}**',
                inviteToParticipate: 'React with 🤞 to participate!',
                winMessage: 'Congratulations, {winners}! You won **{prize}**!',
                embedFooter: 'Giveaway',
                noWinner: 'Giveaway cancelled, no participations.',
                hostedBy: 'Hosted by: {user}',
                winners: 'winner(s)',
                endedAt: 'Ended at',
                units: {
                    seconds: 'seconds',
                    minutes: 'minutes',
                    hours: 'hours',
                    days: 'days',
                    pluralS: false // Not needed, because units end with a S so it will automatically removed if the unit value is lower than 2
                }
            }
        }).catch(err => {
            message.reply('Bad input.');
        });
    }
    if(msg.startsWith(`${prefix}info`)) {

        id = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id;
        tag = message.mentions.users.first() ? message.mentions.users.first().tag : message.author.tag;
        avatar = message.mentions.users.first()? message.mentions.users.first().displayAvatarURL() : message.author.displayAvatarURL();
        member = message.mentions.users.first() ? message.guild.members.cache.get(message.mentions.users.first().id) : message.member;

        roles = [];
        member.roles.cache.forEach(role => {
            if(role.name == `@everyone`) return;
            roles.push(`<@&${role.id}>`);
        });

        embed = new Discord.MessageEmbed()
            .setColor('DARK_BLUE')
            .setThumbnail(avatar)
            .setAuthor(tag, avatar)
            .setDescription(`» ID: **${id}** \n» Joined: **${moment.utc(member.joinedAt).format('DD/MM/YY')}** \n» Roles: ${roles.length == 0 ? `No roles.` : roles.join(``)}`)
        message.channel.send(embed);
    }
    if(msg == `${prefix}serverinfo`) {

        roles = message.guild.roles.cache.sort((a, b) => b.position - a.position).map(role => role.toString());
        members = message.guild.members.cache;
        channels = message.guild.channels.cache;
        emojis = message.guild.emojis.cache;

        embed = new Discord.MessageEmbed()
            .setDescription(`**Server Info**`)
            .setColor('DARK_BLUE')
            .setThumbnail(message.guild.iconURL())
            .addField('General', [
                `**Name:** ${message.guild.name}`,
                `**ID:** ${message.guild.id}`,
                `**Owner:** ${message.guild.owner.user.tag} (${message.guild.ownerID})`,
                `**Boost Tier:** ${message.guild.premiumTier ? `Tier ${message.guild.premiumTier}` : 'None'}`,
                `**Time Created:** ${moment(message.guild.createdTimestamp).format('LT')} ${moment(message.guild.createdTimestamp).format('LL')} [${moment(message.guild.createdTimestamp).fromNow()}]`,
                '\u200b'
            ])
            .addField('Statistics', [
                `**Role Count:** ${roles.length}`,
                `**Emoji Count:** ${emojis.size}`,
                `**Member Count:** ${message.guild.memberCount}`,
                `**Humans:** ${members.filter(member => !member.user.bot).size}`,
                `**Bots:** ${members.filter(member => member.user.bot).size}`,
                `**Text Channels:** ${channels.filter(channel => channel.type === 'text').size}`,
                `**Voice Channels:** ${channels.filter(channel => channel.type === 'voice').size}`,
                `**Boost Count:** ${message.guild.premiumSubscriptionCount || '0'}`,
                '\u200b'
            ])
            .addField('Presence', [
                `**Online:** ${members.filter(member => member.presence.status === 'online').size}`,
                `**Idle:** ${members.filter(member => member.presence.status === 'idle').size}`,
                `**Do Not Disturb:** ${members.filter(member => member.presence.status === 'dnd').size}`,
                `**Offline:** ${members.filter(member => member.presence.status === 'offline').size}`,
                '\u200b'
            ])
            .setTimestamp();
        message.channel.send(embed);
    }
    if(msg.startsWith(`${prefix}colors`)) {

        data = JSON.parse(fs.readFileSync(`./data/roles.json`));

        display = [];
        for(i in data) {
            display.push(`${(parseInt(i) + 1)}) <@&${data[i]}>`);
        }

        if(md[1]) {

            if(data[md[1] - 1]) {

                data.forEach(id => {
                    message.member.roles.remove(id);
                });
                message.member.roles.add(data[md[1] - 1]);

                embed = new Discord.MessageEmbed()
                    .setColor('GREEN')
                    .setDescription(`Success!`)
                message.channel.send(embed);
            } else {
                embed = new Discord.MessageEmbed()
                    .setColor('DARK_RED')
                    .setDescription(`Not found.`)
                message.channel.send(embed);
            }

        } else {
            embed = new Discord.MessageEmbed()
                .setColor('ORANGE')
                .setTitle(`Colorful Roles`)
                .setFooter(`${prefix}colors [ID]`)
                .setDescription(display.length == 0 ? `No roles to show.` : display.join(` \n`))
            message.channel.send(embed);
        }
    }
    if(msg.startsWith(`${prefix}search`)) {

        if(!md[1]) {
            embed = new Discord.MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`You need to include what you want to search!`)
            message.channel.send(embed);
            return
        }

        message.react(`⌛`);

        searched = await store.search(md.slice(1).join(" "), 'xbox', 1);
        if(searched.length == 0) {
            embed = new Discord.MessageEmbed()
                .setColor('ORANGE')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`${md.slice(1).join(" ")} could not be found.`)
            message.channel.send(embed);
            return
        }

        product = await store.get(searched[0].url, true);
        embed = new Discord.MessageEmbed()
            .setColor('DARK_BLUE')
            .setImage(product.img)
            .setTitle(product.name)
            .setURL(searched[0].url)
            .addField(`Price`, searched[0].price, true)
            .addField(`Rating`, product.rating, true)
            .addField(`Category`, product.category, true)
            .setFooter(`Requested by ${message.author.tag}`, message.author.displayAvatarURL())
        message.channel.send(embed);
    }
    if(msg == `${prefix}leaderboard`) {
        lb.execute(message, client);
    }
    if(msg.startsWith(`${prefix}give-xp`)) {

        if(!message.member.roles.cache.has(staffRoleID)) {
            embed = new Discord.MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`You are not authorised to use this command.`)
            message.channel.send(embed);
            return
        }
        if(!message.mentions.users.first() || isNaN(md[2])) {
            embed = new Discord.MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor(message.author.tag, message.author.displayAvatarURL())
                .setDescription(`You are not authorised to use this command.`)
            message.channel.send(embed);
            return
        }

        xp = parseInt(md[2]);

        if(!fs.existsSync(`./data/xp/${message.mentions.users.first().id}.json`)) {
            data = {
                m: xp,
            }
            fs.writeFileSync(`./data/xp/${message.mentions.users.first().id}.json`, JSON.stringify(data, null, 4), err => {
                console.log(err);
            });
        } else {

            data = JSON.parse(fs.readFileSync(`./data/xp/${message.mentions.users.first().id}.json`));
            data.m += xp;

            fs.writeFileSync(`./data/xp/${message.mentions.users.first().id}.json`, JSON.stringify(data, null, 4), err => {
                console.log(err);
            });
        }

        message.react('✅');
    }
    if(msg == `${prefix}xp`) {
        embed = new Discord.MessageEmbed()
            .setColor('DARK_BLUE')
            .setDescription(`${fs.existsSync(`./data/xp/${message.author.id}.json`) ? JSON.parse(fs.readFileSync(`./data/xp/${message.author.id}.json`)).m: 0} XP`)
        message.channel.send(embed);
    }
});

client.login(token);

module.exports = client;