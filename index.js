const Discord = require('discord.js');
const fs = require('fs');
const cfg = require('./config.json');
require('dotenv').config()
const mongodb = require('mongodb');
const request = require('request');
const Imgur = require('imgur');
const {randomNickname} = require('./src/randomNickname');
const {esperar} = require('./src/esperar');
const {removerBackground} = require('./src/removerBackground');
const {converterMoedas} = require('./src/converterMoedas');
const {addBlacklist} = require('./src/addBlacklist');
const {playerBan} = require('./src/ban');
const {playerKick} = require('./src/kick');
const {eventMask} = require('./src/masks/eventMask');
const salvarJSON = require('./src/salvar');
const remAcento = require('./src/removeracento');
const HelpList = require('./help/help_list.json');
const {giphy} = require('./src/giphy');
const {jooj} = require('./src/Jimp functions/jooj');
const {ojjo} = require('./src/Jimp functions/ojjo');
const {recognizeAnime} = require('./src/recognizeAnime');
const {synctube} = require('./src/synctube');
const {leet} = require('./src/leet');

//Calendar
const meses = require('./src/masks/meses');
const semanas = require('./src/masks/semanas');
const {changeMyMind} = require('./src/changeMyMind');

//Global Variables
var dbOk = 0;
var emoteList = new Array();
var chanceReact = 8; //chance = valor^-1    
var fusohorario = -3;

//MongoDB
var MongoClient = mongodb.MongoClient;
const url_DB = process.env.TOKEN_DB;
MongoClient.connect(url_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async conn  =>  {
    client_db = conn.db('cax_discord_bot');
    console.log("Conexão com MongoDB realizada com sucesso.");
    rankingFile = await client_db.collection(cfg.dbRanking).findOne();
    ResponseList = await client_db.collection(cfg.dbAutoResposta).findOne();
    BlackList = await client_db.collection(cfg.dbBlackList).findOne();
    playlists = await client_db.collection(cfg.dbPlaylists).findOne();
    audiosAleatorios = await client_db.collection(cfg.dbAudiosAleatorios).findOne();
    eventos = await client_db.collection(cfg.dbEventos).findOne();
    botActivities = await client_db.collection(cfg.dbbotActivities).findOne();
    msgsOn = await client_db.collection(cfg.dbmsgOn).findOne();
    dbOk = 1 //server running successfully
})
.catch(err => {
    console.log(`Erro ao conectar o MongoClient. [${err}]`);
    dbOk = 2; //connection server error
});

//Imgur
Imgur.setClientId(process.env.TOKEN_IMGUR);
Imgur.setAPIUrl('https://api.imgur.com/3/');

//Auxiliary Variables
var auxiliarAlgum = false;
var auxiliarAddAutoresposta = false;
var auxiliarRemAutoresposta = false;
var auxiliarVotacao = false;
var auxiliarEvento = false;
var lastResponseList = "";
var contadorVote = {};
var fraseVote = null;

//Functions
function uploadGiphy(postData) {
    var options = {
        url: 'https://upload.giphy.com/v1/gifs?api_key=' + process.env.TOKEN_GIPHY,
        formData: postData,
        json: true
    };
    console.log('Uploading gif to Giphy');
    const p = new Promise((resolve, reject) => {
        request.post(options, function (e, resp, body) {
            if (e || resp.statusCode !== 200) reject(`Status code: ${resp.statusCode}\nError message: ${resp.body.meta.msg}`);
            resolve('https://media.giphy.com/media/' + body.data.id + '/giphy.jpg');
        });
    });
    return p;
}

async function botStatus() { //change bot status
    let arrayActivities = botActivities.activities;
    while (true) {
        let rand = Math.floor(Math.random() * (arrayActivities.length));
        try {
            if (arrayActivities[rand]["url"]) {
                bot.user.setActivity(arrayActivities[rand]["activity"], {
                    "type": arrayActivities[rand]["type"],
                    "url": arrayActivities[rand]["url"],
                });
            } else {
                bot.user.setActivity(arrayActivities[rand]["activity"], {
                    "type": arrayActivities[rand]["type"]
                });
            }            
        } catch (error) {
            console.log(`Ocorreu um erro em no botStatus\nNúmero da mensagem: ${rand}\nCorpo da mensagem: ${arrayActivities[rand]}`);
        }
        await esperar(600000);
    }
}

async function checkEvent(channel) { //check if a event exist in that time
    while (true) {
        let Now = new Date();
        Now.setSeconds(0, 0);
        if (eventos[Now.getTime()]) {
            embed = {
                "title": "Lembrete",
                "description": eventos[Now.getTime()],
                "color": 16711685,
                "author": {
                    "name": "Cax",
                    "icon_url": "https://cdn.discordapp.com/app-icons/487992303298805761/84f9701521f87e6edd46fd15e4f30c77.png"
                }
            };
            channel.send("@everyone", {embed});
            delete eventos[Now.getTime()];
            salvarJSON.salvarDB(client_db, eventos, cfg.dbEventos);
        }
        await esperar(60000);
    }
}

//Discord Bot
const bot = new Discord.Client();
bot.login(process.env.TOKEN_BOT); //Token do bot

//Inicial bot state 
bot.on('ready', async () => {
    while (dbOk == 0) { //DB not ready yet
        console.log("Esperando a resposta do banco de dados.");
        console.log("Reiniciando em 5 segundos...");
        await esperar(5000);
    }
    if (dbOk == 1) { //Normal inicialization on DB
        var textChannel = bot.guilds.first().systemChannel;
        
        let rand = Math.floor(Math.random() * (msgsOn["msgs"].length));
        // textChannel.send(msgsOn["msgs"][rand]);
        
        console.log("Banco de dados executado com sucesso.");
        console.log('Logado como: ' + bot.user.tag + '!');
        
        var data = new Date();
        if((data.getUTCHours() + fusohorario)<0){
            newhour = 24+(data.getUTCHours() + fusohorario);
        }else{
            newhour = (data.getUTCHours() + fusohorario);
        }
        console.log(`${semanas[data.getUTCDay()]}, ${data.getUTCDate()}/${meses[data.getUTCMonth()]}/${data.getUTCFullYear()} ${newhour}:${data.getUTCMinutes()}:${data.getUTCSeconds()}`);
        
        emoteList = bot.guilds.first().emojis.map(e => e.id);
        
        //Continuos functions
        botStatus();
        checkEvent(textChannel);
        
    } else if (dbOk == 2) { //Error on DB inicialization
        console.log("Erro ao iniciar o bot.");
        var textChannel = bot.guilds.first().systemChannel;
        textChannel? textChannel.send(`Erro ao iniciar o bot.`) : console.log("Não foi possível enviar a mensagem de erro ao canal de texto.");
    }
});

//Bot removed from a server
bot.on("guildDelete", guild => {
    console.log("O bot foi removido do servidor: " + guild.name + " (id: " + guild.id + ").");
});

//New member on server
bot.on('guildMemberAdd', async member => {
    console.log("Novo Usuário: " + member + " - ID: " + member.id);
    rankingFile[member.id] = {
        'Points': 0
    };
    const channel = bot.guilds.first().systemChannel;
    if (!channel) {
        console.log("Canal de 'boas vindas' não existe.");
        return;
    }
    member.setNickname(await randomNickname())
        .catch(e => {
            message.reply(`Erro: \n${e}`);
            console.log(e);
        });
    channel.send("Bem vindo ao esgoto do Discord, " + member.user + ". \nEsteja avisado que tudo o que você verá aqui é o mais puro **ódio**, **preconceito** e **niilismo** que já existiu. Mas você entrou assim mesmo. \n\nEntão, @everyone, deem os \"meus pêsames\" para " + member + ".\nhttps://i.imgur.com/2WPnTN1.png");
    salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
});

//New message typed on text channel
bot.on('message', async message => {
    if (message.author.bot) return; //Ignore msg from bots
    
    if (auxiliarAddAutoresposta || auxiliarRemAutoresposta || auxiliarVotacao || auxiliarEvento) { //check if some auxiliary was changed
        auxiliarAlgum = true;
    } else {
        auxiliarAlgum = false;
    }
    
    if (!rankingFile[message.author.id]) { //Add people to list of points already on server before bot enters
        rankingFile[message.author.id] = {
            'Points': 0
        };
    }
    
    //Bot reactions
    reactRand = Math.floor(Math.random() * chanceReact);
    if (reactRand == 0) {
        message.react(emoteList[Math.floor(Math.random() * emoteList.length)]);
    }
    
    rankingFile[message.author.id]['Points'] = rankingFile[message.author.id]['Points'] + 1;
    
    if (message.content.startsWith(cfg.prefix) || auxiliarAlgum) { //Commands w/ prefix
        messageClear = message.content.substr(1).toLowerCase(); //Remove prefix of string
        //Help
        if (messageClear.startsWith("help") || messageClear.startsWith("meajudajesus")) {
            if (messageClear.startsWith("help")) {
                var args = messageClear.substr(5);
            } else {
                var args = messageClear.substr(13);
            }
            if (!args) {
                let helps = Object.keys(HelpList);
                let helpsString = "**Lista de comandos:**\n";
                for (i = 0; i < helps.length; i++) {
                    if (i < (helps.length - 1)) {
                        helpsString = `${helpsString}\`${helps[i]}\`,`;
                    } else {
                        helpsString = `${helpsString}\`${helps[i]}\`.`;
                    }
                }
                message.channel.send(helpsString);
                return;
            }
            if (HelpList[args]) {
                message.channel.send(HelpList[args]);
                return;
            }
        }
        //Add auto-answer
        else if (messageClear.startsWith("addresposta") || auxiliarAddAutoresposta) {
            let args = message.content.substr(13).toLocaleLowerCase();
            if (ResponseList[remAcento.remover(args)] && !auxiliarAddAutoresposta) { //se a resposta já existe
                console.log(`Um novo request de auto-resposta iniciado por [${message.author.username}].`);
                lastResponseList = remAcento.remover(args.toLowerCase());
                auxiliarAddAutoresposta = true;
                message.channel.send(`Já existe uma auto-resposta para ${lastResponseList}.\nQual a nova resposta?`)
                .then(msg => msg.delete(5000));
                message.delete(5000);
                return;
            } else if (args == "" && !auxiliarAddAutoresposta) { //se a resposta foi digitada
                message.reply("você digitou o comando errado, vai ser burro na cabeça do meu pau!\nA sintaxe correta é: " + cfg.prefix + "resposta [resposta]");
                return;
            }
            if (message.content.toLowerCase() == "cancelar" && auxiliarAddAutoresposta) { //cancelar adição de resposta
                message.reply("adição de resposta cancelada. :sweat_smile:");
                console.log(`Adição de resposta para [${lastResponseList}] cancelada por [${message.author.username}]`);
                lastResponseList = "";
                auxiliarAddAutoresposta = false;
                return;
            }
            if (!auxiliarAddAutoresposta) { //define a PERGUNTA
                console.log(`Um novo request de auto-resposta iniciado por [${message.author.username}].`);
                lastResponseList = remAcento.remover(args.toLowerCase());
                ResponseList[lastResponseList] = [null];
                auxiliarAddAutoresposta = true;
                message.channel.send("Qual a resposta para '" + lastResponseList + "'?")
                .then(msg => msg.delete(5000));
                message.delete(5000);
            } else { //define a RESPOSTA
                if (ResponseList[lastResponseList][0] != null) {
                    ResponseList[lastResponseList].push(message.content);
                    message.reply("nova resposta para '" + lastResponseList + "' foi adicionado como: " + message.content + ". :kissing_heart:")
                    .then(msg => msg.delete(5000));
                    message.delete(5000);
                    console.log(`Nova auto-resposta adicionada para [${lastResponseList}] como [${message.content}] por [${message.author.username}].`);
                    salvarJSON.salvarDB(client_db, ResponseList, cfg.dbAutoResposta);
                    lastResponseList = "";
                    auxiliarAddAutoresposta = false;
                } else {
                    ResponseList[lastResponseList][0] = message.content;
                    message.reply("sua resposta para '" + lastResponseList + "' foi adicionado como: " + message.content + ". :kissing_heart:")
                    .then(msg => msg.delete(5000));
                    message.delete(5000);
                    console.log(`Nova auto-resposta adicionada para [${lastResponseList}] como [${message.content}] por [${message.author.username}].`);
                    salvarJSON.salvarDB(client_db, ResponseList, cfg.dbAutoResposta);
                    lastResponseList = "";
                    auxiliarAddAutoresposta = false;
                }
            }
            rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 3);
            salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
            return;
        }
        //Remove auto-answer
        else if (messageClear.startsWith("remresposta") || auxiliarRemAutoresposta) {
            let argsAux = message.content.split(/ +/);
            argsAux.shift();
            argsAux = argsAux.join(" ");
            argsAux = remAcento.remover(argsAux.toLowerCase());
            if (ResponseList[argsAux] || auxiliarRemAutoresposta) { //Se existe a auto-resposta
                if (!auxiliarRemAutoresposta) { //Inicio do request de remoção || auxuliarRemAutorespsota == false
                    var msgstring = "";
                    msgstring = `Remover uma resposta para \`${argsAux}\`:\n`;
                    for (i = 0; i < Object.keys(ResponseList[argsAux]).length; i++) {
                        msgstring += `      [${i+1}] - \`${ResponseList[argsAux][i]}\`\n`;
                    }
                    msgstring += `      [0] - \`Cancelar\`\n`;
                    msgstring += `Selecione uma resposta:`;
                    adrMsgString = await message.channel.send(msgstring);
                    message.delete(1000);
                    auxiliarRemAutoresposta = true;
                    lastResponseList = argsAux;
                } else { //Escolha da resposta || auxuliarRemAutorespsota == true
                    args = message.content;
                    if (args == 0) { //Se [0] - Cancelar
                        message.reply("adição de resposta cancelada. :sweat_smile:").then(msg => msg.delete(5000));
                        console.log(`Remoção de resposta para [${lastResponseList}] cancelada por [${message.author.username}]`);
                        lastResponseList = "";
                        auxiliarRemAutoresposta = false;
                        message.channel.fetchMessage(adrMsgString.id).then(msg => msg.delete(1000));
                        message.delete(1000);
                        return;
                    } else if (!isFinite(args)) { //Se não for um numero inteiro
                        message.reply(`você digitou o comando errado.\nApenas numeros são aceitos.`).then(msg => msg.delete(5000));
                        message.delete(5000);
                        return;
                    } else if ((args < 0) || (args < Object.keys(ResponseList[lastResponseList]).length)) { //Se for menor que zero ou maior que o tamanho da string de auto-resposta
                        message.reply(`você digitou o comando errado.\nApenas os número da opção são aceitos.`).then(msg => msg.delete(5000));
                        message.delete(1000);
                        return;
                    } else { //Remoção da auto-resposta
                        if (Object.keys(ResponseList[lastResponseList]).length > 1) {
                            console.log(`Remoção da resposta [${ResponseList[lastResponseList][args-1]}] para [${lastResponseList}] concluida com sucesso por [${message.author.username}].`);
                            ResponseList[lastResponseList].splice(args - 1, 1);
                        } else if (Object.keys(ResponseList[lastResponseList]).length == 1) {
                            console.log(`Remoção da única resposta [${ResponseList[lastResponseList]}] para [${lastResponseList}] concluida com sucesso por [${message.author.username}].`);
                            delete ResponseList[lastResponseList];
                        }
                        message.reply(`auto-resposta deletada.`).then(msg => msg.delete(5000));
                        salvarJSON.salvarDB(client_db, ResponseList, cfg.dbAutoResposta);
                        lastResponseList = "";
                        auxiliarRemAutoresposta = false;
                        message.channel.fetchMessage(adrMsgString.id).then(msg => msg.delete(1000));
                        message.delete(1000);
                    }
                }
            } else { //Se não existe a auto-resposta
                let args = message.content.split(/ +/);
                args.shift();
                args = args.join(" ");
                message.reply(`não existe [${args}] na lista de auto-resposta.`).then(msg => msg.delete(5000));
                message.delete(5000);
                return;
            }
        }
        //Show points
        else if (messageClear.startsWith("pontos")) {
            message.reply("você tem " + rankingFile[message.author.id]['Points'] + " decepções. :confused:");
            return;
        }
        //Ping
        else if (messageClear.startsWith("ping")) {
            const msgPing = await message.channel.send("Ping? :thinking:");
            msgPing.edit("Pong! :ping_pong:\nLatencia da mensagem: " + (msgPing.createdTimestamp - message.createdTimestamp) + "ms\nLatencia do bot: " + Math.round(bot.ping) + "ms");
            rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 1);
            salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
            return;
        }
        //Clear
        else if (messageClear.startsWith("limpar")) {
            if (!message.member.roles.some(r => [cfg.cargoAdm, cfg.cargoMod].includes(r.name))) {
                message.reply("Seu cargo não te dá permissão para limpar o chat.");
                return;
            }
            let args = message.content.slice(cfg.prefix.length).split(/ +/);
            args.shift();
            if (args.length == 0) {
                message.reply("a sintaxe correta do comando é: '" + cfg.prefix + "limpar [numero]'.");
                return;
            }
            if (args.length > 1) {
                message.reply("este comando deve conter apenas um argumento.");
                return;
            } else {
                let qntMsgApagar = parseInt(args[0]) + 1;
                message.channel.fetchMessages({
                    limit: qntMsgApagar
                }).then(messages => message.channel.bulkDelete(messages));
                message.reply("as mensagens foram apagadas :relaxed:")
                .then(msg => msg.delete(1000));
                console.log(`Foram apagadas ${qntMsgApagar-1} mensagens.`);
                rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 2);
                salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
                return;
            }
        }
        //Kick
        else if (messageClear.startsWith("kick")) {
            await playerKick(message);
        }
        //Ban
        else if (messageClear.startsWith("ban")) {
            await playerBan(message);
        }
        //Votação
        else if (messageClear.startsWith("votação") || auxiliarVotacao) {
            if (!auxiliarVotacao) {
                message.channel.send("A votação iniciou! Digite ``resultado`` para encerrar a votação");
                fraseVote = messageClear.substr(7);
                fraseVote = fraseVote.split(',');
                for (let i = 0; i < fraseVote.length; i++) {
                    if (fraseVote[i].startsWith(" ")) {
                        fraseVote[i] = fraseVote[i].substr(1);
                    }
                    contadorVote[fraseVote[i]] = {
                        'Score': 0
                    };
                }
                auxiliarVotacao = true;
                rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 2);
            } else if (message.content.startsWith("resultado")) {
                var fraseCompleta = ("Pronto, a votação acabou. Estes são os resultados:\n\n");
                for (let i = 0; i < fraseVote.length; i++) {
                    fraseCompleta = (fraseCompleta + fraseVote[i] + ": " + contadorVote[fraseVote[i]]["Score"] + "\n")
                }
                message.channel.send(fraseCompleta);
                auxiliarVotacao = false;
                contadorVote = {};
            } else {
                if (contadorVote[message.content]) {
                    contadorVote[message.content]["Score"]++;
                    message.reply("voto computado.");
                    rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 1);
                } else {
                    message.reply("essa opção não existe.");
                }
            }
            salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
            return;
        }
        //Escolher
        else if (messageClear.startsWith("escolher")) {
            var fraseChoose = messageClear.substr(8);
            fraseChoose = fraseChoose.split(',');
            for (let i = 0; i < fraseChoose.length; i++) {
                if (fraseChoose[i].startsWith(" ")) {
                    fraseChoose[i] = fraseChoose[i].substr(1);
                }
            }
            let aleatório = Math.floor((Math.random() * fraseChoose.length) + 1);
            message.reply("o escolhido foi: " + fraseChoose[aleatório - 1]);
            rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 1);
            salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
            return;
        }
        //BlackList
        else if (messageClear.startsWith("blacklist")) {
            let args = remAcento.remover(message.content.substr(11));
            addBlacklist(BlackList, args, message);
            salvarJSON.salvarDB(client_db, BlackList, cfg.dbBlackList);
            rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 3);
            salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
            return;
        }
        //Emotes
        else if (messageClear.startsWith("emotes")) {
            let emoteStr = "Lista de emotes do canal:\n"
            let emojiStrE = message.guild.emojis.map(e => e.toString()).join(" ");
            emoteStr = emoteStr + emojiStrE;
            message.channel.send(emoteStr);
        }
        //Gif
        else if (messageClear.startsWith("gif")) {
            let searchGif = messageClear.substr(4);
            try{
                message.channel.send(await giphy.search(searchGif));
            } catch(e){
                message.channel.send(e)
                .then(msg => {
                    msg.delete(1000);
                    message.delete(1000);
                });
            }
        }
        //Random Gif
        else if (messageClear.startsWith("randomgif")) {
            let searchGif = messageClear.substr(10);
            try{
                message.channel.send(await giphy.random(searchGif));
            }catch(e){
                message.channel.send(e)
                .then(msg => {
                    msg.delete(1000);
                    message.delete(1000);
                });
            }
        }
        //Leet
        else if (messageClear.startsWith("leet")) {
            let textRaw = messageClear.substr(5);
            if (textRaw == ""){
                message.channel.send(`Erro: é necessário definir um texto.`).then(msg => msg.delete(5000));
                return;
            }
            textConverted = await leet.converter(textRaw);
            message.channel.send(textConverted);
        }
        //Converter moedas
        else if (messageClear.startsWith("converter")) {
            let args = message.content.split(/ +/);
            args.shift();
            args[0] = args[0].replace(",", ".");
            converterMoedas(args, message);
        }
        //Rip
        else if (messageClear.startsWith("rip")) {
            let argsRip = message.content.split(/ +/);
            argsRip.shift();
            argsRip = argsRip.join(" ");
            giphy.random('gifs', {
                "tag": "crying"
            }).then(gifObject => {
                var ripmessage = `Sinto a sua falta, ${argsRip}. Volta logo :cry: \n`;
                if (gifObject.data.images.id) {
                    giphy.gifByID(gifObject.data.images.id).then(ansID => {
                        ripmessage += ansID.data.bitly_url;
                        message.channel.send(ripmessage);
                    })
                }
            })
        }
        //Remover background
        else if (messageClear.startsWith("rembg")) {
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            if (args.startsWith("http") || args.startsWith("www")) {
                removerBackground(args, message);
            } else {
                var Attachment = (message.attachments).array();
                Attachment.forEach(function (attachment) {
                    removerBackground(attachment.url, message);
                });
            }
        }
        //Upload Giphy
        else if (messageClear.startsWith("upgif")) {
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            if (args.startsWith("http") || args.startsWith("www")) {
                var postData = {
                    api_key: process.env.TOKEN_GIPHY,
                    source_image_url: args
                };
                uploadGiphy(postData).then((gifUrl) => {
                    message.reply(gifUrl);
                    console.log('Posted to ' + gifUrl);
                }).catch((err) => {
                    console.log(err);
                    message.channel.send(`Upload error: \n${err}`);
                });
            } else {
                var Attachment = (message.attachments).array();
                Attachment.forEach(function (attachment) {
                    var postData = {
                        api_key: process.env.TOKEN_GIPHY,
                        source_image_url: attachment.url
                    };
                    uploadGiphy(postData).then((gifUrl) => {
                        message.reply(gifUrl);
                        console.log('Posted to ' + gifUrl);
                    }).catch((err) => {
                        console.log(err);
                        message.channel.send(`Upload error: \n${err}`);
                    });
                });
            }
        }
        //Contar
        else if (messageClear.startsWith("contar")) {
            let args = messageClear.split(/ +/);
            args.shift();
            args = args[0];
            args = args.split(":");
            if (args.length == 1) { //inseriu apenas os segundos
                var time = {
                    segundos: args[0]
                };
                let msgID = await message.channel.send(`Contagem iniciada de \`${time.segundos} segundos\``);
                while (time.segundos >= 0) {
                    msgID.edit(`Contagem: \`${time.segundos}\``);
                    time.segundos--;
                    await esperar(1000);
                }
                msgID.edit(`Contagem encerrada.`);
                message.channel.send(`Contagem de \`${args[0]} segundos\` encerrada.`)
            } else if (args.length == 2) { //inseriu minutos e segundos
                var time = {
                    minutos: args[0],
                    segundos: args[1]
                }
                let msgID = await message.channel.send(`Contagem iniciada de \`${time.minutos} minutos e ${time.segundos} segundos\``);
                while (time.segundos >= 0 && time.minutos >= 0) {
                    msgID.edit(`Contagem: \`${time.minutos}:${time.segundos}\``);
                    if (time.minutos > 0 && time.segundos == 0) {
                        time.minutos--;
                        time.segundos = 60;
                    }
                    time.segundos--;
                    await esperar(1000);
                }
                msgID.edit(`Contagem encerrada.`);
                message.channel.send(`Contagem de \`${args[0]} minutos e ${args[1]} segundos\` encerrada.`);
            } else if (args.length == 3) { //inseriu horas, minutos e segundos
                var time = {
                    horas: args[0],
                    minutos: args[1],
                    segundos: args[2]
                };
                let msgID = await message.channel.send(`Contagem iniciada de \`${time.horas} horas e ${time.minutos} minutos e ${time.segundos} segundos\``);
                while (time.segundos >= 0 && time.minutos >= 0) {
                    msgID.edit(`Contagem: \`${time.horas}:${time.minutos}:${time.segundos}\``);
                    if (time.horas > 0 && time.minutos == 0 && time.segundos == 0) {
                        time.horas--;
                        time.minutos = 59;
                        time.segundos = 60;
                    }
                    if (time.minutos > 0 && time.segundos == 0) {
                        time.minutos--;
                        time.segundos = 60;
                    }
                    time.segundos--;
                    await esperar(1000);
                }
                msgID.edit(`Contagem encerrada.`);
                message.channel.send(`Contagem de \`${args[0]} horas e ${args[1]} minutos e ${args[2]} segundos\` encerrada.`);
                
            } else { //Erro: inseriu mais do que 3 argumentos
                message.reply(`só são permitidos horas, minutos e segundos.`)
                return;
            }
        }
        //Add Evento
        else if (messageClear.startsWith("addevento") || auxiliarEvento) {
            if (!auxiliarEvento){ //Inicio do request de adição e auxiliarEvento == false
                eventState = eventMask;
                let argsSplited = message.content.split(/ +/);
                argsSplited.shift();
                let dia = argsSplited.shift();
                let hora = argsSplited[0];
                dia = dia.split("/");
                hora = hora.split(":");
                if(dia.length!=3||hora.length!=2){
                    message.reply(`**erro no formato da data.**\nO único formato aceito é: \`[dd/mm/aaaa] [hh:mm]\``);
                    return;
                }
                let eventDate = new Date(dia[2], dia[1]-1, dia[0], hora[0], hora[1]);
                eventState.timestamp = eventDate.getTime();
                message.delete(1000);
                adrMsgStringEvent = await message.reply(`digite o evento que será lembrado no dia \`${dia[0]}/${dia[1]}/${dia[2]}\` às \`${hora[0]}:${hora[1]}\` :\nDigite \`0\` para cancelar.`);
                auxiliarEvento = true;
                return;
            }else{
                if (message.content != 0){ //Se for uma resposta válida
                    eventState.mensagem = message.content;
                    eventos[eventState.timestamp] = eventState.mensagem;
                    salvarJSON.salvarDB(client_db, eventos, cfg.dbEventos);
                    message.channel.send(`Evento adicionado com sucesso. :3`).then(msg=>msg.delete(5000));
                    rankingFile[message.author.id]['Points'] = (rankingFile[message.author.id]['Points'] + 3);
                    salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
                }
                adrMsgStringEvent.delete(1000);
                message.delete(1000);
                auxiliarEvento = false;
            }
        }
        //Imgur
        else if (messageClear.startsWith("upimgur")) {
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            if (args.startsWith("http") || args.startsWith("www")) {
                Imgur.uploadUrl(args)
                .then(json => {
                    message.reply(json.data.link);
                })
                .catch(err => {
                    message.channel.send(err.message);
                });
            } else {
                var Attachment = (message.attachments).array();
                Attachment.forEach(function (attachment) {
                    Imgur.uploadUrl(attachment.url)
                    .then(json => {
                        message.reply(json.data.link);
                    })
                    .catch(err => {
                        message.channel.send(err.message);
                    });
                });
            }
        }
        //Auto-answer list
        else if (messageClear.startsWith("respostas")) {
            let resposta = message.content.trim().split(/ +/g);
            resposta.shift();
            resposta = resposta.join(" ");
            resposta = remAcento.remover(resposta.toLowerCase());
            if (!resposta){
                let respostas = Object.keys(ResponseList);
                let charLimit = 1900;
                let msg = "";
                let i=0;
                message.reply(`**Lista de auto-respostas:**`);
                while((respostas.length>=1)&&(respostas[0])){
                    msg = "```";
                    while((msg.length<charLimit)&&(respostas[0])){
                        msg += `${respostas[0]}, `;
                        respostas.shift();
                    }
                    msg = msg.slice(0, msg.length - 2);
                    msg += ".```";
                    message.channel.send(`${msg}`)
                    i++;
                }
            }
            else if(ResponseList[resposta]){
                let msg = `Respostas para **${resposta}**:\n\`\`\``;
                for(i=0;i<ResponseList[resposta].length;i++){
                    msg += `    ${i+1} - ${ResponseList[resposta][i]}\n`;
                }
                msg += `\`\`\``;
                message.channel.send(msg);
            }
            else{
                message.channel.send(`Não existe nenhuma resposta para **${resposta}**.`);
            }
        }
        //Random Nickname
        else if (messageClear.startsWith("apelido")) {
            let newNick = await randomNickname();
            message.member.setNickname(newNick).then(() => {
                message.reply(`seu novo nome é ${newNick}`);
            })
            .catch(e => {
                message.reply(`Erro: \n${e}`);
                console.log(e);
            });
        }
        //Joojojjo
        else if (messageClear.startsWith("joojojjo")) {
            var args = message.content.split(/ +/);
            args.shift();
            let mention = message.mentions.users.first();
            if (mention) {
                let temp_dir_ojjo = await ojjo(mention.avatarURL);
                let temp_dir_jooj = await jooj(mention.avatarURL);
                await message.reply("Aqui está:", {
                    files: [
                        `./${temp_dir_jooj}`,
                        `./${temp_dir_ojjo}`
                        
                    ]
                });
                console.log(`> Joojojjo criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir_jooj}`);
                    fs.unlinkSync(`./${temp_dir_ojjo}`);
                } catch (err) {
                    console.error(err);
                }
            } else if (message.attachments.size != 0) {
                var Attachment = (message.attachments).array();
                Attachment.forEach(async function (attachment) {
                    let temp_dir_jooj = await jooj(attachment.url);
                    let temp_dir_ojjo = await ojjo(attachment.url);
                    await message.reply("Aqui está:", {
                        files: [
                            `./${temp_dir_jooj}`,
                            `./${temp_dir_ojjo}`
                        ]
                    });
                    console.log(`> Joojojjo criado.`);
                    try {
                        fs.unlinkSync(`./${temp_dir_jooj}`);
                        fs.unlinkSync(`./${temp_dir_ojjo}`);
                    } catch (err) {
                        console.error(err);
                    }
                });
            } else if (args[0].startsWith("http") || args[0].startsWith("www")) {
                let temp_dir_jooj = await jooj(args[0]);
                let temp_dir_ojjo = await ojjo(args[0]);
                await message.reply("Aqui está:", {
                    files: [
                        `./${temp_dir_jooj}`,
                        `./${temp_dir_ojjo}`
                    ]
                });
                console.log(`> Joojojjo criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir_jooj}`);
                    fs.unlinkSync(`./${temp_dir_ojjo}`);
                } catch (err) {
                    console.error(err);
                }
            } else {
                message.reply('não foi possivel encontrar uma imagem na sua mensagem.')
            }
        }
        //Jooj
        else if (messageClear.startsWith("jooj")) {
            var args = message.content.split(/ +/);
            args.shift();
            let mention = message.mentions.users.first();
            if (mention) {
                let temp_dir = await jooj(mention.avatarURL);
                await message.reply("Aqui está:",{
                    files:[
                        `./${temp_dir}`
                    ]
                });
                console.log(`> Jooj criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir}`);
                }catch(err){
                    console.error(err);
                }
            } else if(message.attachments.size!=0){
                var Attachment = (message.attachments).array();
                Attachment.forEach(async function (attachment) {
                    let temp_dir = await jooj(attachment.url);
                    await message.reply("Aqui está:",{
                        files:[
                            `./${temp_dir}`
                        ]
                    });
                    console.log(`> Jooj criado.`);
                    try {
                        fs.unlinkSync(`./${temp_dir}`);
                    }catch(err){
                        console.error(err);
                    }
                });
            } else if (args[0].startsWith("http") || args[0].startsWith("www")) {
                let temp_dir = await jooj(args[0]);
                await message.reply("Aqui está:",{
                    files:[
                        `./${temp_dir}`
                    ]
                });
                console.log(`> Jooj criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir}`);
                }catch(err){
                    console.error(err);
                }
            } else {
                message.reply('não foi possivel encontrar uma imagem na sua mensagem.')
            }
        }
        //Ojjo
        else if (messageClear.startsWith("ojjo")) {
            var args = message.content.split(/ +/);
            args.shift();
            let mention = message.mentions.users.first();
            if (mention) {
                let temp_dir = await ojjo(mention.avatarURL);
                await message.reply("Aqui está:",{
                    files:[
                        `./${temp_dir}`
                    ]
                });
                console.log(`> Ojjo criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir}`);
                }catch(err){
                    console.error(err);
                }
            } else if(message.attachments.size!=0){
                var Attachment = (message.attachments).array();
                Attachment.forEach(async function (attachment) {
                    let temp_dir = await ojjo(attachment.url);
                    await message.reply("Aqui está:",{
                        files:[
                            `./${temp_dir}`
                        ]
                    });
                    console.log(`> Ojjo criado.`);
                    try {
                        fs.unlinkSync(`./${temp_dir}`);
                    }catch(err){
                        console.error(err);
                    }
                });
            } else if (args[0].startsWith("http") || args[0].startsWith("www")) {
                let temp_dir = await ojjo(args[0]);
                await message.reply("Aqui está:",{
                    files:[
                        `./${temp_dir}`
                    ]
                });
                console.log(`> Ojjo criado.`);
                try {
                    fs.unlinkSync(`./${temp_dir}`);
                }catch(err){
                    console.error(err);
                }
            } else {
                message.reply('não foi possivel encontrar uma imagem na sua mensagem.')
            }
        }
        //Qual Anime
        else if (messageClear.startsWith("qualanime")) {
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            if (args.startsWith("http") || args.startsWith("www")) {
                recognizeAnime(args, message);
            } else {
                var Attachment = (message.attachments).array();
                Attachment.forEach(function (attachment) {
                    recognizeAnime(attachment.url, message);
                });
            }
        }
        //Link to youtube sync
        else if (messageClear.startsWith("youtube")) {
            const base_url_synctube = 'https://sync-tube.de/create';
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            try {
                const url_Room = await synctube(args);
                message.reply(url_Room);
            }catch (err){
                message.reply(`não foi possivel criar a sala, mas você pode fazer isso em: ${base_url_synctube}`);
                console.log(err);
            }
        }
        //Change my mind
        else if (messageClear.startsWith("changemymind")) {
            let args = message.content.split(/ +/);
            args.shift();
            args = args.join(" ");
            let temp_img = await changeMyMind(args).catch((msgErr)=>{
                message.reply(`erro: ${msgErr}`);
                return;
            });
            await message.reply("", {
                files:[
                    `${temp_img}`
                ]
            });
            console.log(`> Change My Mind criado.`);
            try {
                fs.unlinkSync(`${temp_img}`);
            }catch(err){
                console.error(err);
            }
        }
        //Unknown command
        else{
            message.channel.send(`https://i.imgur.com/nJ42BI9.jpg`);
        }
        
    } else { //Without prefix
        //Auto-resposta
        if (ResponseList[remAcento.remover(message.content.toLowerCase())]) {
            var random = Math.floor(Math.random() * (ResponseList[remAcento.remover(message.content.toLowerCase())].length - 0) + 0);
            message.channel.send(ResponseList[remAcento.remover(message.content.toLowerCase())][random]);
            rankingFile[message.author.id]['Points']++;
        }
        //BlackList
        if (BlackList[remAcento.remover(message.content.toLowerCase())]) {
            message.delete();
            message.reply("palavra bloqueada! :rage:");
            rankingFile[message.author.id]['Points']--; //tira pontos de quem disse a palavra bloqueada
        }
        salvarJSON.salvarDB(client_db, rankingFile, cfg.dbRanking);
        return;
    }
});