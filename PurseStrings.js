/*
PurseStrings
A money management system for Roll20 using the 5eShaped Sheet.

On Github:	https://github.com/blawson69/PurseStrings
Contact me: https://app.roll20.net/users/1781274/ben-l
Like this script? Buy me a coffee: https://venmo.com/theBenLawson
*/

var PurseStrings = PurseStrings || (function () {
    'use strict';

    //---- INFO ----//

    var version = '2.0',
		attributes = {cp:'pursestrings_cp',sp:'pursestrings_sp',ep:'pursestrings_ep',gp:'pursestrings_gp',pp:'pursestrings_pp'},
		dropChange = false,

	logReadiness = function (msg) {
		log('--> PurseStrings v' + version + ' <-- Initialized');
	},

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!ps')) {
			var parms = msg.content.split(/\s+/i);
			if (parms[1]) {
				switch (parms[1]) {
					case '--setup':
						if (playerIsGM(msg.playerid)) {
							commandSetup(msg);
						}
						break;
					case '--add':
						if (playerIsGM(msg.playerid)) {
							commandAdd(msg);
						}
						break;
					case '--dist':
						if (playerIsGM(msg.playerid)) {
							commandDist(msg);
						}
						break;
					case '--subt':
						if (playerIsGM(msg.playerid)) {
							commandSubt(msg);
						}
						break;
					case '--buy':
						commandBuy(msg);
						break;
					case '--show':
						commandShow(msg);
						break;
                    default:
                        sendChat('PurseStrings', 'You called !ps without a valid parameter. Try again.', null, {noarchive:true});
				}
			} else {
				sendChat('PurseStrings', 'You called !ps without any parameters. Try again.', null, {noarchive:true});
			}
		}
    },

    commandSetup = function (msg) {
		// Setup character for using PurseStrings
		if (!msg.selected || !msg.selected.length) {
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}

		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token) {
				if (token.get('represents') !== '') {
					var char_id = token.get('represents');
					var character = getObj('character', token.get('represents'));

					if (!hasPurse(char_id)) {
						_.each(attributes, function(attribute) {
							var curAttr = createObj('attribute', {
									characterid: char_id,
									name: attribute,
									current: '0'
								});
						});

                        addShowPurse(char_id);

                        var message = '<b>Success!</b><br>PurseStrings setup is complete for ' + character.get('name') + '.';
						var coins = parseCoins(msg.content);
						if (coins) {
							var initpurse = changePurse(msg.content, char_id, 'add');
                            if (initpurse) {
                                message += ' Also, ' + prettyCoins(coins, true) + ' have been added to their Purse.';
                            }
						}

                        showDialog('Setup Complete', character.get('name'), message, false);
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
				var changed = changePurse(msg.content, token.get('represents'), 'add');
				if (changed) {
					showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' added successfully.', false);
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
				var changed = changePurse(msg.content, token.get('represents'), 'subt');
				if (changed) {
					showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' subtracted successfully.', false);
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
				if (token.get('represents') !== '' && hasPurse(token.get('represents'))) {
					var character = getObj('character', token.get('represents'));
					var purse = getPurse(character.get('id'));
					var content = prettyCoins(purse, false) + '.';

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
				var purchased = changePurse(msg.content, buyer.get('id'), 'subt');
				if (purchased) {
					var sold = changePurse(msg.content, seller.get('id'), 'add');
					if (sold) {
						showDialog('Transaction Success', buyer.get('name'), 'You paid ' + prettyCoins(parseCoins(msg.content), true) + ' to ' + seller.get('name') + '.', false);
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

    commandDist = function (msg) {
		// Distribute loot between selected characters
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w GM No tokens are selected!', null, {noarchive:true});
			return;
		}

		var loot = parseCoins(msg.content), comments = '', recipients = [];
		if (loot) {
			var numParty, partyMembers = [], tmpcoins = [], xtracoins = [], splits, lefties, rando;
			_.each(msg.selected, function(obj) {
				var selected = getObj(obj._type, obj._id);
				if(selected && selected.get('represents') !== '') {
					partyMembers.push(selected.get('represents'));
				}
			});
			numParty = partyMembers.length;

			xtracoins['cp'] = (loot['cp'] % numParty);
			xtracoins['sp'] = (loot['sp'] % numParty);
			xtracoins['ep'] = (loot['ep'] % numParty);
			xtracoins['gp'] = (loot['gp'] % numParty);
			xtracoins['pp'] = (loot['pp'] % numParty);

			tmpcoins['cp'] = parseInt(loot['cp'] / numParty);
			tmpcoins['sp'] = parseInt(loot['sp'] / numParty);
			tmpcoins['ep'] = parseInt(loot['ep'] / numParty);
			tmpcoins['gp'] = parseInt(loot['gp'] / numParty);
			tmpcoins['pp'] = parseInt(loot['pp'] / numParty);

			splits = _.values(tmpcoins);
			lefties = _.values(xtracoins);
			rando = Math.floor(Math.random() * numParty);

			_.each(msg.selected, function(obj) {
				var token = getObj(obj._type, obj._id);
				if(token && token.get('represents') !== '') {
					var character = getObj('character', token.get('represents'));
					var changed = changePurse(splits.join(':'), token.get('represents'), 'add');
					if (changed) {
						recipients.push(character.get('name'));
					}
				}
			});

			if (dropChange) {
				comments = '<br>' + prettyCoins(xtracoins, true) + ' are left over from even distribution.'
			} else {
				var lucky = partyMembers[rando];
				var character = getObj('character', lucky);
				var changed = changePurse(lefties.join(':'), lucky, 'add');
				if (changed) {
					comments = '<br>' + character.get('name') + ' recieved ' + prettyCoins(xtracoins, true) + ' of leftover loot.';
				} else {
					sendChat('PurseStrings', '/w GM Could not add leftovers to ' + character.get('name'), null, {noarchive:true});
				}
			}
			showDialog('Loot Distributed', '', prettyCoins(loot, true) + ' have been successfully distributed between the following characters:<br><ul><li>' + recipients.join('</li><li>') + '</li></ul>Each has received ' + prettyCoins(tmpcoins, true) + '.' + comments, false);
		} else {
			sendChat('PurseStrings', '/w GM No coinage was indicated or coinage syntax was incorrect', null, {noarchive:true});
		}
    },

	parseCoins = function (cmds) {
		// Parses the input for the coin string and returns it as an array or null if error
		var coins = null, tmpcoins = {cp:0,sp:0,ep:0,gp:0,pp:0},
		regex = /[:]+/i,
		commands = cmds.toString().split(/\s+/);
		if (regex.test(cmds)) {
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

	changePurse = function (pockets, charid, type='add') {
		// Add or subtract from a character's Purse
		var result = true;
		var character = getObj('character', charid);
		if (hasPurse(character.get('id'))) {
			var coins = parseCoins(pockets);
			if (coins) {
				var purse = getPurse(character.get('id'));

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
						// platinum pieces
						if (coins['pp'] > 0) {
							if (purse['pp'] >= coins['pp']) {
								purse['pp'] -= coins['pp'];
							} else {
								while (purse['pp'] < coins['pp'] && purse['gp'] >= 10) {
									purse['pp'] += 1;
									purse['gp'] -= 10;
								}
								if (purse['pp'] >= coins['pp']) {
									purse['pp'] -= coins['pp'];
								} else {
									while (purse['pp'] < coins['pp'] && purse['ep'] >= 20) {
										purse['pp'] += 1;
										purse['ep'] -= 20;
									}
									if (purse['pp'] >= coins['pp']) {
										purse['pp'] -= coins['pp'];
									} else {
										while (purse['pp'] < coins['pp'] && purse['sp'] >= 100) {
											purse['pp'] += 1;
											purse['sp'] -= 100;
										}
										if (purse['pp'] >= coins['pp']) {
											purse['pp'] -= coins['pp'];
										} else {
											while (purse['pp'] < coins['pp'] && purse['cp'] >= 1000) {
												purse['pp'] += 1;
												purse['cp'] -= 1000;
											}
											if (purse['pp'] >= coins['pp']) {
												purse['pp'] -= coins['pp'];
											} else {
												result = false;
												sendChat('PurseStrings', '/w GM Not enough coinage to cover ' + coins['pp'] + 'pp?', null, {noarchive:true});
											}
										}
									}
								}
							}
						}

						// gold pieces
						if (coins['gp'] > 0) {
							if (purse['gp'] >= coins['gp']) {
								purse['gp'] -= coins['gp'];
							} else {
								while (purse['gp'] < coins['gp'] && purse['pp'] > 0) {
									purse['gp'] += 10;
									purse['pp'] -= 1;
								}
								if (purse['gp'] >= coins['gp']) {
									purse['gp'] -= coins['gp'];
								} else {
									while (purse['gp'] < coins['gp'] && purse['ep'] > 2) {
										purse['gp'] += 1;
										purse['ep'] -= 2;
									}
									if (purse['gp'] >= coins['gp']) {
										purse['gp'] -= coins['gp'];
									} else {
										while (purse['gp'] < coins['gp'] && purse['sp'] > 10) {
											purse['gp'] += 1;
											purse['sp'] -= 10;
										}
										if (purse['gp'] >= coins['gp']) {
											purse['gp'] -= coins['gp'];
										} else {
											while (purse['gp'] < coins['gp'] && purse['cp'] > 100) {
												purse['gp'] += 1;
												purse['cp'] -= 100;
											}
											if (purse['gp'] >= coins['gp']) {
												purse['gp'] -= coins['gp'];
											} else {
												result = false;
												sendChat('PurseStrings', '/w GM Not enough coinage to cover ' + coins['gp'] + 'gp?', null, {noarchive:true});
											}
										}
									}
								}
							}
						}

						// electrum pieces
						if (coins['ep'] > 0) {
							if (purse['ep'] >= coins['ep']) {
								purse['ep'] -= coins['ep'];
							} else {
								while (purse['ep'] < coins['ep'] && purse['gp'] > 0) {
									purse['ep'] += 2;
									purse['gp'] -= 1;
								}
								if (purse['ep'] >= coins['ep']) {
									purse['ep'] -= coins['ep'];
								} else {
									while (purse['ep'] < coins['ep'] && purse['pp'] > 0) {
										purse['ep'] += 20;
										purse['pp'] -= 1;
									}
									if (purse['ep'] >= coins['ep']) {
										purse['ep'] -= coins['ep'];
									} else {
										while (purse['ep'] < coins['ep'] && purse['sp'] > 5) {
											purse['ep'] += 1;
											purse['sp'] -= 5;
										}
										if (purse['ep'] >= coins['ep']) {
											purse['ep'] -= coins['ep'];
										} else {
											while (purse['ep'] < coins['ep'] && purse['cp'] > 50) {
												purse['ep'] += 1;
												purse['cp'] -= 50;
											}
											if (purse['ep'] >= coins['ep']) {
												purse['ep'] -= coins['ep'];
											} else {
												result = false;
												sendChat('PurseStrings', '/w GM Not enough coinage to cover ' + coins['ep'] + 'ep?', null, {noarchive:true});
											}
										}
									}
								}
							}
						}

						// silver pieces
						if (coins['sp'] > 0) {
							if (purse['sp'] >= coins['sp']) {
								purse['sp'] -= coins['sp'];
							} else {
								while (purse['sp'] < coins['sp'] && purse['ep'] > 5) {
									purse['sp'] += 5;
									purse['ep'] -= 1;
								}
								if (purse['sp'] >= coins['sp']) {
									purse['sp'] -= coins['sp'];
								} else {
									while (purse['sp'] < coins['sp'] && purse['gp'] > 0) {
										purse['sp'] += 10;
										purse['gp'] -= 1;
									}
									if (purse['sp'] >= coins['sp']) {
										purse['sp'] -= coins['sp'];
									} else {
										while (purse['sp'] < coins['sp'] && purse['pp'] > 0) {
											purse['sp'] += 100;
											purse['pp'] -= 1;
										}
										if (purse['sp'] >= coins['sp']) {
											purse['sp'] -= coins['sp'];
										} else {
											while (purse['sp'] < coins['sp'] && purse['cp'] > 10) {
												purse['sp'] += 1;
												purse['cp'] -= 10;
											}
											if (purse['sp'] >= coins['sp']) {
												purse['sp'] -= coins['sp'];
											} else {
												result = false;
												sendChat('PurseStrings', '/w GM Not enough coinage to cover ' + coins['sp'] + 'sp?', null, {noarchive:true});
											}
										}
									}
								}
							}
						}

						// copper pieces
						if (coins['cp'] > 0) {
							if (purse['cp'] >= coins['cp']) {
								purse['cp'] -= coins['cp'];
							} else {
								while (purse['cp'] < coins['cp'] && purse['sp'] > 0) {
									purse['cp'] += 10;
									purse['sp'] -= 1;
								}
								if (purse['cp'] >= coins['cp']) {
									purse['cp'] -= coins['cp'];
								} else {
									while (purse['cp'] < coins['cp'] && purse['ep'] > 0) {
										purse['cp'] += 50;
										purse['ep'] -= 1;
									}
									if (purse['cp'] >= coins['cp']) {
										purse['cp'] -= coins['cp'];
									} else {
										while (purse['cp'] < coins['cp'] && purse['gp'] > 0) {
											purse['cp'] += 100;
											purse['gp'] -= 1;
										}
										if (purse['cp'] >= coins['cp']) {
											purse['cp'] -= coins['cp'];
										} else {
											while (purse['cp'] < coins['cp'] && purse['pp'] > 0) {
												purse['cp'] += 1000;
												purse['pp'] -= 1;
											}
											if (purse['cp'] >= coins['cp']) {
												purse['cp'] -= coins['cp'];
											} else {
												result = false;
												sendChat('PurseStrings', '/w GM Not enough coinage to cover ' + coins['cp'] + 'cp?', null, {noarchive:true});
											}
										}
									}
								}
							}
						}
					}
				}

				var cp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['cp'] })[0];
				var sp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['sp'] })[0];
				var ep = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['ep'] })[0];
				var gp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['gp'] })[0];
				var pp = findObjs({ type: 'attribute', characterid: character.get('id'), name: attributes['pp'] })[0];

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

	prettyCoins = function (coins, dropZero=false) {
		// Return a pretty (grammatically speaking) string of coins from a coin array for dialog
		var result = '', joiner = ' ', tmpres = [];
		if (coins['cp'] > 0 || !dropZero) tmpres.push(coins['cp'] + 'cp');
		if (coins['sp'] > 0 || !dropZero) tmpres.push(coins['sp'] + 'sp');
		if (coins['ep'] > 0 || !dropZero) tmpres.push(coins['ep'] + 'ep');
		if (coins['gp'] > 0 || !dropZero) tmpres.push(coins['gp'] + 'gp');
		if (coins['pp'] > 0 || !dropZero) tmpres.push(coins['pp'] + 'pp');
		if (tmpres.length > 1) tmpres[tmpres.length-1] = 'and ' + tmpres[tmpres.length-1];
		if (tmpres.length > 2) joiner = ', '
		result = tmpres.join(joiner);
		return result;
	},

    addShowPurse = function (charid) {
        // Adds an ability to the character during setup for the --show command
        var abilities = findObjs({
            name: 'ShowPurse',
            type: 'ability',
            characterid: charid
        })[0];

        if (!abilities) {
            var spmacro = createObj("ability", {
                name: 'ShowPurse',
                characterid: charid,
                action: '!ps --show',
                istokenaction: true
            });
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
    'use strict';
	PurseStrings.logReadiness();
    PurseStrings.registerEventHandlers();
});
