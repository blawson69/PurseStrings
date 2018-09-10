/*
PurseStrings
A money management system for Roll20 using the 5eShaped Sheet.

Github:		https://github.com/blawson69/PurseStrings
Contact:	https://app.roll20.net/users/1781274/ben-l
*/

var PurseStrings = PurseStrings || (function () {
    'use strict';

    //---- INFO ----//

    var version = '0.1.0',
		attributes = {cp:'pursestrings_cp',sp:'pursestrings_sp',ep:'pursestrings_ep',gp:'pursestrings_gp',pp:'pursestrings_pp'},

	logReadiness = function (msg) {
		log('--> PurseStrings v' + version + ' <-- Initialized');
	},

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!ps')) {
            var regex = /(\![^\ ]+) ([^\ ]+)(.+)*/igm;
            var command = regex.exec(msg.content);
            if (command[3]){
                command[3] = command[3].trim();
            }
            if (command && command[2]){
                if (command[2].startsWith("--")) {
                    if (command[2] == '--setup') {
                        if (playerIsGM(msg.playerid)) {
                            commandSetup(msg);
                        } else {
                            sendChat('PurseStrings', '/w GM Only the GM can access PurseStrings configuration commands!', null, {noarchive:true});
                        }
                    } else if (command[2] == '--add' && command[3]) {
						commandAdd(msg);
					} else if (command[2] == '--subt' && command[3]) {
						commandSubt(msg);
					} else if (command[2] == '--show') {
						commandShow(msg);
					} else if (command[2] == '--buy' && command[3]) {
						commandBuy(msg);
					} else {
						sendChat('PurseStrings', '/w GM Invalid command!', null, {noarchive:true});
					}

                } else {
                    sendChat('PurseStrings', '/w GM You passed a parameter incorrectly. Use !ps --help', null, {noarchive:true});
                }
            } else {
                sendChat('PurseStrings', '/w GM You called !ps without any parameters. Use !ps --help', null, {noarchive:true});
            }
		}
    },

    commandSetup = function (msg) {
		// Configure character sheet for each selected character
		if (!msg.selected || !msg.selected.length) {
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}

		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token) {
				if (token.get('represents') !== '') {
					var char_id = token.get('represents');
					//sendChat('PurseStrings', '/w GM Character ID "' + char_id + '" selected.', null, {noarchive:true});
					var character = getObj('character', token.get('represents'));

					if (!hasPurse(char_id)) {
						_.each(attributes, function(attribute) {
							var curAttr = createObj('attribute', {
									characterid: char_id,
									name: attribute,
									current: '0'
								});
						});

						sendChat('PurseStrings', '/w GM PurseString attributes successfully added for ' + character.get('name') + '!', null, {noarchive:true});

						var coins = parseCoins(msg);
						if (coins) {
							commandAdd(msg);
						}
					} else {
						sendChat('PurseStrings', '/w GM PurseString attributes already exist for ' + character.get('name') + '!', null, {noarchive:true});
					}
				}
			}
		});
	},

	commandAdd = function (msg) {
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}

		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token && token.get('represents') !== '') {
				var character = getObj('character', token.get('represents'));
				var changed = changePurse(msg, token.get('represents'), 'add');
				if (changed) {
					showDialog('Purse Updated', character.get('name'), 'Coins added successfully.', false);
					commandShow(msg);
				}
			}
		});
	},

	commandSubt = function (msg) {
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}

		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token && token.get('represents') !== '') {
				var character = getObj('character', token.get('represents'));
				var changed = changePurse(msg, token.get('represents'), 'subt');
				if (changed) {
					showDialog('Purse Updated', character.get('name'), 'Coins subtracted successfully.', false);
					commandShow(msg);
				} else {
					showDialog('Transaction Error', character.get('name'), 'You don\'t have enough money for that operation!', false);
				}
			}
		});
	},

	commandShow = function (msg) {
		// Show one or more individual's current Purse contents
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}
		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token) {
				if (token.get('represents') !== '') {
					var character = getObj('character', token.get('represents'));
					var purse = getPurse(character.get('id'));
					var content = purse['cp'] + 'cp, ' + purse['sp'] + 'sp, ' + purse['ep'] + 'ep, ' +
					purse['gp'] + 'gp, and ' + purse['pp'] + 'pp.';

					// Count coins to determine total weight
					var total = purse['cp'] + purse['sp'] + purse['ep'] + purse['gp'] + purse['pp'];
					content += '<br>Total weight of coins: ' + (total * 0.02).toFixed(2) + ' lbs.';

					showDialog('Purse Contents', character.get('name'), content, false);
				}
			}
		});
	},

	commandBuy = function (msg) {
		var seller, buyer, commands = msg.content.split(/\s+/);
		if (commands[2] && commands[2] !== '') buyer = getObj('character', commands[2]);
		if (commands[3] && commands[3] !== '') seller = getObj('character', commands[3]);

		if (buyer && seller) {
			if (hasPurse(seller.get('id'))) {
				var purchased = changePurse(msg, buyer.get('id'), 'subt');
				if (purchased) {
					var sold = changePurse(msg, seller.get('id'), 'add');
					if (sold) {
						showDialog('Purse Updated', buyer.get('name'), 'Your purchase from ' + seller.get('name') + ' is successful!', false);
					}
				} else {
					showDialog('Transaction Error', buyer.get('name'), 'You don\'t have enough money for that transaction!', false);
				}
			} else {
				showDialog('Transaction Error', '', 'You must have a valid seller to do business with!', false);
			}
		} else {
			showDialog('Transaction Error', '', 'You must select a buyer and/or seller to do business!', false);
		}
	},

	parseCoins = function (msg) {
		// Parses the input for the coin string and returns it as an array or null if error
		var coins = null, tmpcoins = {cp:0,sp:0,ep:0,gp:0,pp:0},
		regex = /[:]+/i,
		commands = msg.content.split(/\s+/);
		if (regex.test(msg.content)) {
			// Coins sent as cp:sp:ep:gp:pp
			_.each(commands, function (cmd) {
				if (regex.test(cmd)) {
					var msgcoins = cmd.split(':');
					tmpcoins['cp'] = msgcoins[0] && !isNaN(msgcoins[0]) ? parseInt(msgcoins[0]) : 0;
					tmpcoins['sp'] = msgcoins[1] && !isNaN(msgcoins[1]) ? parseInt(msgcoins[1]) : 0;
					tmpcoins['ep'] = msgcoins[2] && !isNaN(msgcoins[2]) ? parseInt(msgcoins[2]) : 0;
					tmpcoins['gp'] = msgcoins[3] && !isNaN(msgcoins[3]) ? parseInt(msgcoins[3]) : 0;
					tmpcoins['pp'] = msgcoins[4] && !isNaN(msgcoins[4]) ? parseInt(msgcoins[4]) : 0;
					coins = tmpcoins;
				}
			});
		} else {
			// Coins sent as single denomination, e.g. 30cp or 100gp
			regex = /^\d+[cp|sp|ep|gp|pp]/i;
			_.each(commands, function (cmd) {
				if (regex.test(cmd)) {
					if (cmd.endsWith('cp')) tmpcoins['cp'] = parseInt(cmd);
					if (cmd.endsWith('sp')) tmpcoins['sp'] = parseInt(cmd);
					if (cmd.endsWith('ep')) tmpcoins['ep'] = parseInt(cmd);
					if (cmd.endsWith('gp')) tmpcoins['gp'] = parseInt(cmd);
					if (cmd.endsWith('pp')) tmpcoins['pp'] = parseInt(cmd);
					coins = tmpcoins;
				}
			});
		}

		return coins;
    },

	hasPurse = function (charid) {
		// Returns whether the provided character has been setup with the correct attributes
		var result = true;
		_.each(attributes, function(attribute) {
			var curAttr = findObjs({
				_type: 'attribute',
				characterid: charid,
				name: attribute
			}, {caseInsensitive: true})[0];
			if (!curAttr) {
				result = false;
			}
		});

		return result;
	},

	getPurse = function (charid) {
		// Returns an array holding the given character's Purse currency
		var purse = [];
		if (hasPurse(charid)) {
			purse['cp'] = parseInt(getAttrByName(charid, attributes['cp'])) || 0;
			purse['sp'] = parseInt(getAttrByName(charid, attributes['sp'])) || 0;
			purse['ep'] = parseInt(getAttrByName(charid, attributes['ep'])) || 0;
			purse['gp'] = parseInt(getAttrByName(charid, attributes['gp'])) || 0;
			purse['pp'] = parseInt(getAttrByName(charid, attributes['pp'])) || 0;
		} else {
			purse = null;
		}

		return purse;
	},

	changePurse = function (msg, charid, type='add') {
		var result = true;
		var character = getObj('character', charid);
		if (hasPurse(character.get('id'))) {
			var coins = parseCoins(msg);
			if (coins) {
				var purse = getPurse(character.get('id'));

				var cp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['cp'] })[0];
				var sp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['sp'] })[0];
				var ep = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['ep'] })[0];
				var gp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['gp'] })[0];
				var pp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['pp'] })[0];

				if (type == 'add') {
					purse['cp'] += coins['cp'];
					purse['sp'] += coins['sp'];
					purse['ep'] += coins['ep'];
					purse['gp'] += coins['gp'];
					purse['pp'] += coins['pp'];
				} else {
					var coinsVal = coins['cp'] + (coins['sp'] * 10) + (coins['ep'] * 50) + (coins['gp'] * 100) + (coins['pp'] * 1000);
					var purseVal = purse['cp'] + (purse['sp'] * 10) + (purse['ep'] * 50) + (purse['gp'] * 100) + (purse['pp'] * 1000);

					if (coinsVal > purseVal) {
						result = false;
					} else {
						if (coins['pp'] > 0) {
							if (purse['pp'] >= coins['pp']) {
								purse['pp'] -= coins['pp'];
							} else {
								coins['pp'] -= purse['pp'];
								purse['pp'] = 0;
								coins['gp'] = coins['pp'] * 10;
							}
						}
						if (coins['gp'] > 0) {
							if (purse['gp'] >= coins['gp']) {
								purse['gp'] -= coins['gp'];
							} else {
								coins['gp'] -= purse['gp'];
								purse['gp'] = 0;
								coins['ep'] = coins['gp'] * 2;
							}
						}
						if (coins['ep'] > 0) {
							if (purse['ep'] >= coins['ep']) {
								purse['ep'] -= coins['ep'];
							} else {
								coins['ep'] -= purse['ep'];
								purse['ep'] = 0;
								coins['sp'] = coins['ep'] * 5;
							}
						}
						if (coins['sp'] > 0) {
							if (purse['sp'] >= coins['sp']) {
								purse['sp'] -= coins['sp'];
							} else {
								coins['sp'] -= purse['sp'];
								purse['sp'] = 0;
								coins['cp'] = coins['sp'] * 10;
							}
						}
						if (coins['cp'] > 0) {
							purse['cp'] -= coins['cp'];
						}
					}
				}

				cp.set('current', purse['cp']);
				sp.set('current', purse['sp']);
				ep.set('current', purse['ep']);
				gp.set('current', purse['gp']);
				pp.set('current', purse['pp']);
			} else {
				result = false;
				sendChat('PurseStrings', '/w GM No coinage was indicated or coinage syntax was incorrect', null, {noarchive:true});
			}
		} else {
			result = false;
			sendChat('PurseStrings', '/w GM ' + character.get('name') + ' has not been set up for PurseStrings! Please use !ps --setup', null, {noarchive:true});
		}

		return result;
	},

	showDialog = function (title, name, content, whisper=true) {
		// Outputs a 5e Shaped dialog box
		var heading = '&{template:5e-shaped} '
		if (whisper) {
			heading = '/w ' + heading;
		}
		if (name == '') {
			sendChat('PurseStrings', heading + ' {{title=' + title + '}} {{content=' + content + '}}');
		} else {
			sendChat('PurseStrings', heading + ' {{title=' + title + '}} {{show_character_name=1}} {{character_name=' + name + '}} {{content=' + content + '}}');
		}
	},

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		logReadiness: logReadiness,
		registerEventHandlers: registerEventHandlers
	};
}());

on("ready", function () {
	PurseStrings.logReadiness();
    PurseStrings.registerEventHandlers();
});
