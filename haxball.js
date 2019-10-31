/*
This script is usable in https://www.haxball.com/headless
Steps:
    1) Copy this script
    2) Go to the link, then press F12
    3) Go to console if it's not already set, then paste
    4) Enter
    5) IF THIS TAB IS CLOSED THE ROOM WILL BE CLOSED TOO
*/

const points = {
    goal: 5,
    assist: 3,
    win: 3,
    cleanSheet: 6,
    loss: -7,
    ownGoal: -3,
};

const geoLocation = {"code": "cz", "lat": 49.94700, "lon": 17.90020};
const roomConfig = {
    roomName: "Ströer Labs - Haxball Room",
    maxPlayers: 16,
    playerName: "Rozhodčí",
    public: false,
    geoLocation
};
const defaultStadiumName = "Big";
const scoreLimit = 3;
const timeLimit = 3;
let room = HBInit(roomConfig);
room.setDefaultStadium(defaultStadiumName);
room.setScoreLimit(scoreLimit);
room.setTimeLimit(timeLimit);

let lastPlayerThatKickedTheBall = undefined;

/*
    Functions
*/
// If there are no admins left in the room give admin to one of the remaining players.
function updateAdmins() {
    // Get all players except the host (id = 0 is always the host)
    let players = room.getPlayerList().filter((player) => player.id != 0);
    if (players.length == 0) return; // No players left, do nothing.
    if (players.find((player) => player.admin) != null) return; // There's an admin left so do nothing.
    room.setPlayerAdmin(players[0].id, true); // Give admin to the first non admin player in the list
}
function initPlayerStats(player) {
    if (stats.get(player.name)) return;
    stats.set(player.name, [0, 0, 0, 0, 0, 0]) // goals, assists, wins, loses, og, cs
}
/*
for commands
*/
function swapFun(player) {
    if (player.admin == true) {
        if (room.getScores() == null) {
            players = room.getPlayerList();
            for (i = 0; i < players.length; i++) {
                if (players[i].team == 1) {
                    room.setPlayerTeam(players[i].id, 2);
                } else if (players[i].team == 2) {
                    room.setPlayerTeam(players[i].id, 1);
                }
            }
        }
    }
}
function pushMuteFun(player, message) { // !mute Anddy
    // Prevent somebody to talk in the room (uses the nickname, not the id)
    // need to be admin
    if (player.admin == true) {
        if (!(mutedPlayers.includes(message.substr(6)))) mutedPlayers.push(message.substr(6));
    }
}
function gotMutedFun(player) {
    if (mutedPlayers.includes(player.name)) {
        return true;
    }
}
function unmuteFun(player, message) { // !unmute Anddy
    // Allow somebody to talk if he has been muted
    // need to be admin
    if (player.admin == true) {
        pos = mutedPlayers.indexOf(message.substr(9));
        mutedPlayers.splice(pos, 1);
    }
}
function adminFun(player, message) { // !admin Anddyisthebest
    // Gives admin to the person who type this password
    room.setPlayerAdmin(player.id, true);
    return false; // The message won't be displayed
}
function putPauseFun() { // p
    room.pauseGame(true);
}
function unPauseFun() { // !p
    room.pauseGame(false);
}
function helpFun() { // !help
    room.sendChat('Available commands: "p", "!p" , "!stats [Nickname]", "!ranking", "!poss", "!resetstats", "!adminhelp", "!gkhelp", "!rankhelp"');
}
function adminHelpFun() {
    room.sendChat('Available commands: "!mute Player", "!unmute Player", ' +
        '"!clearbans", "!rr", "!swap" (to switch reds and blues). You need to be admin.')
}
function gkHelpFun() { // !gkhelp
    room.sendChat('The most backward player at the kick off will be set as gk. (write "!gk" if you want to be goal keeper).')
}
function rankHelpFun() { // !gkhelp
    room.sendChat(`Scores for ranking: ${JSON.stringify(points)}`);
}
function statsFun(player, message) { // !stats Anddy
    const playerName = message.substr(7) || player.name;
    console.log(`Getting stats for player ${playerName}`);
    if (stats.get(playerName)) {
        sendStats(playerName);
    } else {
        return false;
    }
}
function rankFun() { // !ranking
    const ranking = getRanking() || '';
    const rankings = ranking.split(',');
    const firstSet = rankings.slice(0, 8);
    const secondSet = rankings.slice(8, 16);
    room.sendChat("Points: " + firstSet.join(","));
    if (secondSet.length > 0) {
    	room.sendChat("Points: " + secondSet.join(","));
	}
}
function resetStatsFun(player) { // !resetstats
    if (rankingCalc(player.name) > 0) {
        stats.set(player.name, [0, 0, 0, 0, 0, 0]);
        room.sendChat("Your stats have been reseted ! ")
    } else (room.sendChat("You must have positive points to be able to reset it, sorry."))
}
function clearFun(player) { // !clear
    if (player.admin == true) room.clearBans();
}
function resetFun(player) {
    if (player.admin == true) {
        room.stopGame();
        room.startGame();
    }
}
function gkFun(player) { // !gk
    if (room.getScores() != null && room.getScores().time < 60) {
        if (player.team == 1) {
            gk[0] = player;
        } else if (player.team == 2) {
            gk[1] = player;
        }
    } else {
        room.sendChat(`It's too late to change gk.`);
    }
    room.sendChat("Red GK: " + gk[0].name + ", Blue GK: " + gk[1].name)
    return;
}
function closeFun(player) {
    if (player.name == "js2ps") { // artificially generate an error in order to close the room
        stats.crash();
    }
}
/*
    For ranking
*/
function rankingCalc(player) {
    const playerStats = stats.get(player);

    if (!playerStats) {
        console.error(`unable to get stats for player ${player}`);
    }
	
    console.log(`ranking player ${player.name}`, playerStats, points);
    
    // goals, assists, wins, loses, og, cs
    return playerStats[0] * points.goal + 
        playerStats[1] * points.assist +
        playerStats[2] * points.win + 
        playerStats[3] * points.loss +
        playerStats[4] * points.ownGoal + 
        playerStats[5] * points.cleanSheet;
}
function getRanking() {
    let overall = [];
    players = Array.from(stats.keys());
    for (var i = 2; i < players.length; i++) {
        score = rankingCalc(players[i]);
        overall.push({name: players[i], value: score});
    }
    overall.sort(function (a, b) {
        return b.value - a.value;
    });

    string = "";
    for (var i = 0; i < overall.length; i++) {
        if (overall[i].value != 0) {
            string += i + 1 + ") " + overall[i].name + ": " + overall[i].value + ", ";
        }
    }
    return string;
}
function sendStats(name) {
    const ps = stats.get(name); // stands for playerstats

    if (!ps) {
        console.error(`unable to get stats for player ${name}, got`, ps);
    };

    room.sendChat(name + ": goals: " + ps[0] + ", assists: " + ps[1]
        + ", og: " + ps[4] + ", cs: " + ps[5] + ", wins: " + ps[2] + ", loses: " + ps[3] +
        " points: " + rankingCalc(name));
}
function whichTeam() { // gives the players in the red or blue team
    var players = room.getPlayerList();
    var redTeam = players.filter(player => player.team == 1);
    var blueTeam = players.filter(player => player.team == 2);
    return [redTeam, blueTeam];
}
function isGk() { // gives the mosts backward players before the first kickOff
    var players = room.getPlayerList();
    var min = players[0];
    min.position = {x: room.getBallPosition().x + 60};
    var max = min;
    for (var i = 0; i < players.length; i++) {
        if (players[i].position != null) {
            if (min.position.x > players[i].position.x) min = players[i];
            if (max.position.x < players[i].position.x) max = players[i];
        }
    }
    return [min, max]
}
function updateWinLoseStats(winners, losers) {
    for (let i = 0; i < winners.length; i++) {
        stats.get(winners[i].name)[2] += 1;
    }
    for (let i = 0; i < losers.length; i++) {
        stats.get(losers[i].name)[3] += 1;
    }
}
function initBallCarrying(redTeam, blueTeam) {
    var ballCarrying = new Map();
    var playing = redTeam.concat(blueTeam);
    for (var i = 0; i < playing.length; i++) {
        ballCarrying.set(playing[i].name, [0, playing[i].team]); // secs, team, %
    }
    return ballCarrying;
}
function updateTeamPoss(value) {
    if (value[1] == 1) redPoss += value[0];
    if (value[1] == 2) bluePoss += value[0];
}
var bluePoss;
var redPoss;
function teamPossFun() {
    if (room.getScores() == null) return false;
    bluePoss = 0;
    redPoss = 0;
    ballCarrying.forEach(updateTeamPoss);
    redPoss = Math.round((redPoss / room.getScores().time) * 100);
    bluePoss = Math.round((bluePoss / room.getScores().time) * 100);
    room.sendChat("Ball possession:  red " + redPoss + " - " + bluePoss + " blue.");
}
/*
For the game
*/
// Gives the last player who touched the ball, works only if the ball has the same
// size than in classics maps.
var radiusBall = 10;
var triggerDistance = radiusBall + 15 + 0.1;
function getLastTouchTheBall(lastPlayerTouched, time) {
    var ballPosition = room.getBallPosition();
    var players = room.getPlayerList();
    for (var i = 0; i < players.length; i++) {
        if (players[i].position != null) {
            var distanceToBall = pointDistance(players[i].position, ballPosition);
            if (distanceToBall < triggerDistance) {
                lastPlayerTouched = players[i];
                return lastPlayerTouched;
            }
        }
    }
    return lastPlayerTouched;
}
// Calculate the distance between 2 points
function pointDistance(p1, p2) {
    var d1 = p1.x - p2.x;
    var d2 = p1.y - p2.y;
    return Math.sqrt(d1 * d1 + d2 * d2);
}
function isOvertime() {
    scores = room.getScores();
    if (scores != null) {
        if (scores.timeLimit != 0) {
            if (scores.time > scores.timeLimit) {
                if (scores.red == 0 && hasFinished == false) {
                    stats.get(gk[0].name)[5] += 1;
                    stats.get(gk[1].name)[5] += 1;
                    hasFinished = true;
                }
            }
        }
    }
}
// return: the name of the team who took a goal
const team_name = team => team == 1 ? "blue" : "red";
// return: whether it's an OG
// const isOwnGoal = (team, player) => team != player.team ? " (og)" : "";

function whoScoredGoal(team, lastPlayerThatTouchedTheBall, lastPlayerThatKickedTheBall) {
	if (team === lastPlayerThatTouchedTheBall.team) {
		return lastPlayerThatTouchedTheBall;
	} else {
		if (lastPlayerThatKickedTheBall && team === lastPlayerThatKickedTheBall.team) {
			return lastPlayerThatKickedTheBall;
		} else {
			return lastPlayerThatTouchedTheBall;
		}
	}
}

function isOwnGoal(team, lastPlayerThatTouchedTheBall, lastPlayerThatKickedTheBall) {
	if (whoScoredGoal(team, lastPlayerThatTouchedTheBall, lastPlayerThatKickedTheBall).team === team) {
		return '';
	} else {
		return " (og)";
	}
}

// return: a better display of the second when a goal is scored
const floor = s => s < 10 ? "0" + s : s;
// return: whether there's an assist
const getAssistName = playerList => playerList[0].team == playerList[1].team ? playerList[1].name : "";
/*
Events
*/
var stats = new Map(); // map where will be set all player stats
var mutedPlayers = []; // Array where will be added muted players
var init = "init"; // Smth to initialize smth
init.id = 0; // Faster than getting host's id with the method
init.name = "init";
var scorers; // Map where will be set all scorers in the current game (undefined if reset or end)
var whoTouchedLast; // var representing the last player who touched the ball
var whoTouchedBall = [init, init, init]; // Array where will be set the 2 last players who touched the ball
var gk = [init, init];
var goalScored = false;
var commands = {
    // Command that doesnt need to know players attributes.
    "!help": helpFun,
    "!gkhelp": gkHelpFun,
    "!adminhelp": adminHelpFun,
    "!rankhelp": rankHelpFun,
    "!ranking": rankFun,
    "p": putPauseFun,
    "!p": unPauseFun,
    "!poss": teamPossFun,
    // Command that need to know who is the player.
    "!resetstats": resetStatsFun,
    "!gk": gkFun,
    "!uzvara": adminFun,
    // Command that need to know if a player is admin.
    "!swap": swapFun,
    "!rr": resetFun,
    "!clear": clearFun,
    "!close": closeFun,
    // Command that need to know what's the message.
    "!stats": statsFun,
    // Command that need to know who is the player and what's the message.
    "!mute": pushMuteFun,
    "!unmute": unmuteFun
};
initPlayerStats(room.getPlayerList()[0]); // lazy lol, i'll fix it later
initPlayerStats(init);
room.onPlayerLeave = function (player) {
    updateAdmins();
};
room.onPlayerJoin = function (player) {
    updateAdmins(); // Gives admin to the first player who join the room if there's no one
    initPlayerStats(player); // Set new player's stat
    room.sendChat("Hi " + player.name + " ! Write !help, !adminhelp, !rankhelp or !gkhelp if needed.")
};
var redTeam;
var blueTeam;
room.onGameStart = function () {
    [redTeam, blueTeam] = whichTeam();
    ballCarrying = initBallCarrying(redTeam, blueTeam);
};
room.onPlayerTeamChange = function (player) {
    if (room.getScores() != null) {
        if (1 <= player.team <= 2) ballCarrying.set(player.name, [0, player.team]);
    }
};
room.onPlayerChat = function (player, message) {
    if (mutedPlayers.includes(player.name)) return false;
    let spacePos = message.search(" ");
    let command = message.substr(0, spacePos !== -1 ? spacePos : message.length);
    if (commands.hasOwnProperty(command) == true) return commands[command](player, message);
};
room.onPlayerBallKick = function (player) {
    whoTouchedLast = player;
    lastPlayerThatKickedTheBall = player;
};
var kickOff = false;
var hasFinished = false;
room.onGameTick = function () {
    setInterval(isOvertime, 5000, hasFinished);
    if (kickOff == false) { // simplest comparison to not charge usulessly the tick thing
        if (room.getScores().time != 0) {
            kickOff = true;
            gk = isGk();
            room.sendChat("Red GK: " + gk[0].name + ", Blue GK: " + gk[1].name)
        }
    }
    if (goalScored == false) {
        whoTouchedLast = getLastTouchTheBall(whoTouchedLast);
    }
    if (whoTouchedLast != undefined) {
        if (ballCarrying.get(whoTouchedLast.name)) {
            ballCarrying.get(whoTouchedLast.name)[0] += 1 / 60;
        }
        if (whoTouchedLast.id != whoTouchedBall[0].id) {
        	whoTouchedBall[2] = whoTouchedBall[1];
            whoTouchedBall[1] = whoTouchedBall[0];
            whoTouchedBall[0] = whoTouchedLast; // last player who touched the ball
        }
    }
};
room.onTeamGoal = function (team) { // Write on chat who scored and when.
    goalScored = true;
    var time = room.getScores().time;
    var m = Math.trunc(time / 60);
    var s = Math.trunc(time % 60);
    time = m + ":" + floor(s); // MM:SS format
    var ownGoal = isOwnGoal(team, whoTouchedBall[0], lastPlayerThatKickedTheBall);
    const scoredPlayer = whoScoredGoal(team, whoTouchedBall[0], lastPlayerThatKickedTheBall);
    var assistName = "";
    var assist = "";

    if (ownGoal == "") {
    	if (whoTouchedBall[0].team === team) {
			assistName = getAssistName(whoTouchedBall);
    	} else {
    		assistName = getAssistName(whoTouchedBall.slice(1));
    	}
    }

	if (assistName) {
		assist = " (" + assistName + ")";
	}

    room.sendChat("A goal has been scored by " + scoredPlayer.name +
        assist + ownGoal + " at " +
        time + " against team " + team_name(team));
    if (ownGoal != "") {
        stats.get(scoredPlayer.name)[4] += 1;
    } else {
        stats.get(scoredPlayer.name)[0] += 1;
    }
    if (whoTouchedBall[1] != init && assist != "") stats.get(assistName)[1] += 1;
    if (scorers == undefined) scorers = new Map(); // Initializing dict of scorers
    scorers.set(scorers.size + 1 + ") " + whoTouchedLast.name, [time, assist, ownGoal]);
    whoTouchedBall = [init, init, init];
    whoTouchedLast = undefined;
    lastPlayerThatKickedTheBall = undefined;
};
room.onPositionsReset = function () {
    goalScored = false;
};
room.onTeamVictory = function (scores) { // Sum up all scorers since the beginning of the match.
    if (scores.blue == 0 && gk[0].position != null && hasFinished == false) stats.get(gk[0].name)[5] += 1;
    if (scores.red == 0 && gk[1].position != null && hasFinished == false) stats.get(gk[1].name)[5] += 1;
    if (scores.red > scores.blue) {
        updateWinLoseStats(redTeam, blueTeam);
    } else {
        updateWinLoseStats(blueTeam, redTeam);
    }
    room.sendChat("Scored goals:");
    for (let [key, value] of scorers) { // key: name of the player, value: time of the goal
        room.sendChat(key + " " + value[1] + value[2] + ": " + value[0]);
    }
    teamPossFun();
    rankFun();

    if (Math.random() < 0.05) {
		room.sendChat("Už toho nechte a běžte radši pracovat...");
    }
};
room.onGameStop = function () {
    scorers = undefined;
    whoTouchedBall = [init, init, init];
    whoTouchedLast = undefined;
    gk = [init, init];
    kickOff = false;
    hasFinished = false;
    lastPlayerThatKickedTheBall = undefined;
};
// Made by ToČe
