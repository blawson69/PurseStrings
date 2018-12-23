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

    var version = '3.0',
		attributes = {cp:'pursestrings_cp',sp:'pursestrings_sp',ep:'pursestrings_ep',gp:'pursestrings_gp',pp:'pursestrings_pp'},

    checkInstall = function () {
        if (!_.has(state, 'PURSESTRINGS')) state['PURSESTRINGS'] = state['PURSESTRINGS'] || {};
        if (typeof state['PURSESTRINGS'].partyMembers == 'undefined') state['PURSESTRINGS'].partyMembers = [];
        if (typeof state['PURSESTRINGS'].dropChange == 'undefined') state['PURSESTRINGS'].dropChange = false;
        if (typeof state['PURSESTRINGS'].showStock == 'undefined') state['PURSESTRINGS'].showStock = true;
        log('--> PurseStrings v' + version + ' <-- Initialized');

        if (upgradeNeeded()) {
            var upgradeNotice = 'One or more of your PurseStrings-enabled characters require an upgrade from '
            + 'the previous version. <a href="!ps --upgrade">Click here to perform the upgrade</a>.';
            adminDialog('Upgrade Needed', upgradeNotice);
        }
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
                    case '--drop':
  						if (playerIsGM(msg.playerid)) {
  							commandDrop(msg.content);
  						}
  						break;
                    case '--stock':
  						if (playerIsGM(msg.playerid)) {
  							commandShowStock(msg.content);
  						}
  						break;
                    case '--party':
  						if (playerIsGM(msg.playerid)) {
  							commandParty(msg);
  						}
  						break;
                    case '--config':
  						if (playerIsGM(msg.playerid)) {
  							commandConfig(msg.content);
  						}
  						break;
                    case '--invlist':
  						if (playerIsGM(msg.playerid)) {
  							commandInventory(msg.content);
  						}
  						break;
                    case '--upgrade':
  						if (playerIsGM(msg.playerid)) {
  							commandUpgrade();
  						}
  						break;
                    case '--give':
					case '--buy':
						commandBuy(msg);
						break;
					case '--show':
						commandShow(msg);
						break;
                    case '--help':
                    default:
                        commandHelp();
				}
			} else {
				commandHelp();
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

                        if (!hasEquip(char_id)) {
                            addCoinPurse(char_id);
                        }
                        addShowPurse(char_id);

                        var message = '<b>Success!</b><br>PurseStrings setup is complete for ' + character.get('name') + '.';
						var coins = parseCoins(msg.content);
						if (coins) {
							var initpurse = changePurse(msg.content, char_id, 'add');
                            if (initpurse) {
                                updateCoinWeight(char_id);
                                message += ' Also, ' + prettyCoins(coins, true) + ' have been added to their Purse.';
                            }
						}

                        adminDialog('Setup Complete', message);
					} else {
						sendChat('PurseStrings', '/w GM PurseString attributes already exist for ' + character.get('name') + '!', null, {noarchive:true});
					}
				}
			}
		});
	},

    commandParty = function (msg) {
        // Manage party of characters who will be receiving loot in commandDist
        var message = '', regex = /\-\-reset/i,
        cmdString = msg.content.toString();

        if (regex.test(cmdString)) {
            state['PURSESTRINGS'].partyMembers = [];
            message += '<i>Party members have been reset</i><br><br>';
        }

    	if (!msg.selected || !msg.selected.length) {
    		message += 'No tokens were selected!<br><br>';
    	} else {
            var members = [];
            message = 'The following characters have been added to the Party Members list for loot distribution:<br><ul>';
            _.each(msg.selected, function(obj) {
                var token = getObj(obj._type, obj._id);
                if(token) {
                    if (token.get('represents') !== '') {
                        var char_id = token.get('represents');
                        var character = getObj('character', char_id);
                        if (!_.find(state['PURSESTRINGS'].partyMembers, function(id) {return id == char_id;})) {
                            state['PURSESTRINGS'].partyMembers.push(char_id);
                            members.push('<li>' + character.get('name') + '</li>');
                        }
                    }
                }
            });

            if (!members.length) {
                message += '<li>No valid characters selected!</li>';
            } else {
                message += members.join('');
            }
            message += '</ul>';
        }
        message += '<a href="!ps --config">Settings</a>';

        adminDialog('Party Members', message);
        partyUpdated = true;
    },

    commandHelp = function () {
        // Help dialog with list of commands and a link to the Config Menu
        var message;
        if (playerIsGM(msg.playerid)) {
            message = '<b>!ps --help</b><br>Sends this Help dialog to the chat window.<br><br>'
            + '<b>!ps --dist 500cp 300sp 100gp</b><br>Distributes 500cp, 300sp, and 100gp evenly between Party Members. <i>GM only</i>.<br><br>'
            + '<br>The following commands require one or more tokens representing a character to be selected:<br><br>'
            + '<b>!ps --setup</b><br>Set up for use with PurseStrings. <i>GM only</i>.<br><br>'
            + '<b>!ps --setup 15gp</b><br>Set up and add 15gp startup coins. <i>GM only</i>.<br><br>'
            + '<b>!ps --show</b><br>Show Purse in the chat window.<br><br>'
            + '<b>!ps --show --whisper</b><br>Whisper Purse in the chat window.<br><br>'
            + '<b>!ps --add 15gp</b><br>Add 15gp to the Purse. <i>GM only</i>.<br><br>'
            + '<b>!ps --subt 15gp</b><br>Remove 15gp from the Purse. <i>GM only</i>.<br><br>'
            + '<br>The following commands do not require selected tokens, but do require one or more character IDs:<br><br>'
            + '<b>!ps --give &#60;giver_id&#62; &#60;receiver_id&#62; 15gp</b><br>Giver gives 15gp to Receiver.'
            + '<b>!ps --buy &#60;buyer_id&#62; &#60;seller_id&#62; 15gp</b><br>Exchanges 15gp from buyer to seller.<br><br>'
            + '<b>!ps --buy &#60;buyer_id&#62; &#60;merchant_id&#62; 15gp --inv- item|Dagger</b><br>Buys a Dagger from Merchant for 15gp.<br><br>'
            + '<b>!ps --buy &#60;merchant_id&#62; &#60;seller_id&#62; 7gp --inv+ item|Dagger</b><br>Sells a Dagger to Merchant for 7gp.<br><br>'
            + '<b>!ps --invlist &#60;merchant_id&#62;</b><br>Show Merchant inventory list in chat window. <i>GM only</i>.<br><br>'
            + '}} {{text_center=<br><b><a style="font-size: 125%" href="!ps --config">⚙️ CONFIG MENU</a></b><br><br>';
            adminDialog('PurseStrings Help', message);
        } else {
            message = '<b>!ps --help</b><br>Sends this Help dialog to the chat window.<br><br>'
            + '<br>The following commands require a character token to be selected:<br><br>'
            + '<b>!ps --show</b><br>Show your Purse in the chat window.<br><br>'
            + '<b>!ps --show --whisper</b><br>Whisper your Purse to you in the chat window.<br><br>'
            + '<br>The following command does not require a selected token, but does require character IDs:<br><br>'
            + '<b>!ps --give &#60;giver_id&#62; &#60;receiver_id&#62; 15gp</b><br>Giver gives 15gp to Receiver.';
            showDialog('PurseStrings Help', message, msg.who, true);
        }
    },

    commandDrop = function (msg) {
        // Set the cross-session default falue of dropChange
        var regex = /true|yes|sure|yep/i,
        cmdString = msg.toString();

        if (regex.test(cmdString)) {
            state['PURSESTRINGS'].dropChange = true;
        } else {
            state['PURSESTRINGS'].dropChange = false;
        }

        commandConfig(msg);
    },

    commandShowStock = function (msg) {
        // Set the cross-session default falue of showStock
        var regex = /true|yes|sure|yep/i,
        cmdString = msg.toString();

        if (regex.test(cmdString)) {
            state['PURSESTRINGS'].showStock = true;
        } else {
            state['PURSESTRINGS'].showStock = false;
        }

        commandConfig(msg);
    },

    commandConfig = function (msg) {
        // Config dialog with links to make changes
        var message = '<b>Leftover loot</b> is currently set to be ';
        if (state['PURSESTRINGS'].dropChange) {
            message += 'dropped for non-random distribution. <a href="!ps --drop false">Change</a>';
        } else {
            message += 'given to a random Party Member. <a href="!ps --drop true">Change</a>';
        }

        message += '<br><br><b>Merchant stock</b> currently is set to be ';
        if (state['PURSESTRINGS'].showStock) {
            message += 'shown to players, with "out of stock" items being labeled as such. <a href="!ps --stock false">Change</a>';
        } else {
            message += 'hidden from players, with "out of stock" items not being displayed in the list. <a href="!ps --stock true">Change</a>';
        }

        message += '<br><br><span class="sheet-rt-title"><span class="sheet-rt-title-name">Party Members</span></span><br>';
        if (state['PURSESTRINGS'].partyMembers.length) {
            message += 'The following characters are in the Party Members list for loot distribution:<br><ul>';
            _.each(state['PURSESTRINGS'].partyMembers, function(char_id) {
                var character = getObj('character', char_id);
                message += '<li>' + character.get('name') + '</li>';
            });
            message += "</ul>";
        } else {
            message += 'There are no characters in the Party Members list! ';
        }
        message += 'To add one or more characters to the Party Members list, select their token(s) and <a href="!ps --party">click here</a>.';

        adminDialog('Settings', message);
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
					showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' added successfully.', character.get('name'));
                    showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' added successfully.', msg.who);
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
					showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' subtracted successfully.', character.get('name'));
                    showDialog('Purse Updated', character.get('name'), prettyCoins(parseCoins(msg.content), true) + ' subtracted successfully.', msg.who);
				} else {
					showDialog('Transaction Error', character.get('name'), 'You don\'t have enough money for that operation!', msg.who);
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

					showDialog('Purse Contents', character.get('name'), content, msg.who, whispers(msg.content));
				}
			}
		});
	},

	commandBuy = function (msg) {
		var seller, buyer, item, giving, rx = /\-\-give/gi, commands = msg.content.split(/\s+/);
        giving = (rx.test(msg.content)) ? true : false;
		if (commands[2] && commands[2] !== '') buyer = getObj('character', commands[2]);
		if (commands[3] && commands[3] !== '') seller = getObj('character', commands[3]);
        item = getItemDesc(msg);

		if (buyer && seller) {
			if (hasPurse(seller.get('id'))) {
				var purchased = changePurse(msg.content, buyer.get('id'), 'subt');
				if (purchased) {
					var sold = changePurse(msg.content, seller.get('id'), 'add');
					if (sold) {
                        var paid = prettyCoins(parseCoins(msg.content), true);
                        if (commands[5] && commands[5].match(/\-\-inv[\+\-]/i) !== null) {
                            var add = (commands[5] == '--inv+');
                            var merchant_id = (commands[5] == '--inv+') ? buyer.get('id') : seller.get('id');
                            updateInventory(merchant_id, item, paid, add);
                            showDialog('Transaction Success', seller.get('name'), buyer.get('name') + ' paid you ' + paid + ' for one ' + item + '.', seller.get('name'), true);
                        } else {
                            if (giving) {
                                showDialog('Transaction Success', seller.get('name'), 'You received ' + paid + ' from ' + buyer.get('name') + item + '.', seller.get('name'), true);
                            }
                        }
                        item = item.length > 0 ? ' for one ' + item : item;
                        var successMsg = giving ? 'You gave ' + paid + ' to ' + seller.get('name') + item + '.' : 'You paid ' + paid + ' to ' + seller.get('name') + item + '.';
                        setTimeout(function () {
                            showDialog('Transaction Success', buyer.get('name'), successMsg, msg.who, true);
                        }, 1000);
					}
				} else {
					showDialog('Transaction Error', buyer.get('name'), 'You don\'t have enough money for that transaction!', msg.who, true);
				}
			} else {
                var errMsg1 = giving ? 'You must have a valid recipient!' : 'You must have a valid seller to do business with!';
				showDialog('Transaction Error', buyer.get('name'), errMsg1, msg.who, false);
			}
		} else {
            var errMsg2 = giving ? 'You must have a giver and a receiver to exchange money!' : 'You must have a buyer and a seller to do business!';
            showDialog('Transaction Error', '', errMsg2, msg.who, false);
		}
	},

    commandDist = function (msg) {
		// Distribute loot between selected characters
		var loot = parseCoins(msg.content), comments = '', recipients = [],
        numParty, partyMembers = state['PURSESTRINGS'].partyMembers;
        numParty = partyMembers.length;

        if(msg.selected && msg.selected.length > 0) {
            // This is where we'll include selected tokens with the Party... maybe
            //sendChat('PurseStrings', '/w GM You also had ' + msg.selected.length + ' tokens selected.', null, {noarchive:true});
        }

		if (loot && numParty > 0) {
			var tmpcoins = [], xtracoins = [], splits, lefties, rando;
            rando = randomInteger(numParty) - 1;

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

            _.each(partyMembers, function (id) {
                var member = getObj('character', id);
                if (member) {
                    var changed = changePurse(splits.join(':'), id, 'add');
                    if (changed) {
                        recipients.push(member.get('name'));
                    }
                } else {
                    sendChat('PurseStrings', '/w GM "' + id + '" is an invalid ID.', null, {noarchive:true});
                }
            });

            if (parseInt(lefties.join('')) > 0) {
                var xcoins = prettyCoins(xtracoins, true);
                if (state['PURSESTRINGS'].dropChange) {
                    comments = '<br><br>**You still have ' + xcoins + ' undestributed!** Please choose a someone to receive the leftovers.';
                } else {
                    var lucky = partyMembers[rando];
                    var luckyOne = getObj('character', lucky);
                    var changed = changePurse(lefties.join(':'), lucky, 'add');
                    if (changed) {
                        comments = '<br>' + luckyOne.get('name') + ' recieved ' + xcoins + ' of leftover loot.';
                    } else {
                        sendChat('PurseStrings', '/w GM Could not add leftovers to ' + luckyOne.get('name'), null, {noarchive:true});
                    }
                }
            } else {
                comments = '<br>All coins were evenly distributed.'
            }

			showDialog('Loot Distributed', '', prettyCoins(loot, true) + ' have been successfully distributed between the following Party Members:<br><ul><li>' + recipients.join('</li><li>') + '</li></ul>Each Member has received ' + prettyCoins(tmpcoins, true) + '.' + comments, msg.who, false);
            if (parseInt(lefties.join('')) > 0 && state['PURSESTRINGS'].dropChange) {
                adminDialog('Leftover Loot', 'There are ' + xcoins + ' left over. '
                + '<a href="!ps --add ' + xcoins.replace(/[\,|and]/g,'') + '">Give leftovers</a>');
            }
		} else {
            if (numParty == 0) {
                adminDialog('Distribution Error', 'There are no Party Members to whom you can distribute loot!');
            } else {
                adminDialog('Distribution Error', 'No coinage was indicated or coinage syntax was incorrect!');
            }
		}
    },

    commandInventory = function (msg) {
        //Shows the inventory for a merchant character
        var merchant, char_id = '', inventory = '', commands = msg.split(/\s+/);
		if (commands[2] && commands[2] !== '') {
            char_id = commands[2];
            merchant = getObj('character', char_id);
        }
        if (merchant && hasPurse(char_id)) {
            merchant.get('gmnotes', function (gmnotes) {
                var notes = decodeEditorText(gmnotes, {asArray:true});
                if (notes && notes[0].match(/^PurseStrings Inventory$/i) !== null) {
                    notes.shift();
                    inventory = '&{template:5e-shaped} {{title=Inventory}} {{show_character_name=1}} {{character_name=' + merchant.get('name') + '}} ';
                    _.each(notes, function(item) {
                        if (item.search(/\|/) > 0) {
                            let a = item.split('|');
                            if (state['PURSESTRINGS'].showStock) {
                                if (a[2] !== 0 && a[2] !== '0') {
                                    var quant = (a[2] == -1 || a[2] == '') ? '' : ' (' + a[2] + ' available)'
                                    inventory += '{{' + a[0] + '=' + a[1] + quant + ' <a href="!ps --buy &#64;&lbrace;selected|character_id&rbrace; ' + char_id + ' ' + a[1] + ' --inv- item|' + a[0] + '">Buy</a> }} ';
                                } else {
                                    inventory += '{{' + a[0] + '=' + a[1] + ' (out of stock) }} ';
                                }
                            } else {
                                if (a[2] !== 0 && a[2] !== '0') {
                                    inventory += '{{' + a[0] + '=' + a[1] + ' <a href="!ps --buy &#64;&lbrace;selected|character_id&rbrace; ' + char_id + ' ' + a[1] + ' --inv- item|' + a[0] + '">Buy</a> }} ';
                                }
                            }
                        } else {
                            inventory += '{{' + item.trim() + '=}} ';
                        }
                    });
                    if (whispers(msg)) sendChat(merchant.get('name'), '/w GM ' + inventory);
                    else sendChat(merchant.get('name'), inventory);
                } else {
                    sendChat('PurseStrings', '/w GM Merchant character has no inventory!', null, {noarchive:true});
                }
            });
        } else {
            sendChat('PurseStrings', '/w GM Merchant character is not set up for PurseStrings!', null, {noarchive:true});
        }
        return inventory;
    },

    updateInventory = function (char_id, desc, price, add = false) {
        //Updates the inventory for a merchant character
        var merchant = getObj('character', char_id);
        if (merchant && hasPurse(char_id)) {
            merchant.get('gmnotes', function (gmnotes) {
                var newGMnotes = '';
                var notes = decodeEditorText(gmnotes, {asArray:true});
                if (notes && notes[0].match(/^PurseStrings Inventory$/i) !== null) {
                    var found = _.find(notes, function(note) {let d = note.split('|'); return d[0] == desc});
                    if (found) {
                        _.each(notes, function(item) {
                            if (item.search(/\|/) > 0) {
                                var a = item.split('|');
                                var quant = parseInt(a[2]);
                                if (a[0] === desc && !isNaN(quant)) {
                                    quant = (add) ? quant + 1 : quant - 1;
                                    if (quant < 0) quant = 0;
                                    newGMnotes += '<p>' + desc + '|' + a[1] + '|' + quant + '</p>';
                                } else {
                                     newGMnotes += '<p>' + item + '</p>';
                                }
                            } else {
                                newGMnotes += '<p>' + item + '</p>';
                            }
                        });
                    } else {
                        _.each(notes, function(item) {
                            if (typeof item !== 'undefined') newGMnotes += '<p>' + item + '</p>';
                        });

                        var num = parseInt(price), denom = price.replace(/\d+/, '');
                        var newItem = desc + '|' + (num * 2) + denom + '|1';
                        newGMnotes += '<p>' + newItem + '</p>';
                    }
                    merchant.set('gmnotes', newGMnotes);
                } else {
                    sendChat('PurseStrings', '/w GM Merchant character has no inventory!', null, {noarchive:true});
                }
            });
            setTimeout(function () {
                commandInventory('!ps --invlist ' + char_id);
            }, 500);
        } else {
            sendChat('PurseStrings', '/w GM Merchant character is not set up for PurseStrings!', null, {noarchive:true});
        }
    },

	parseCoins = function (cmds) {
		// Parses the input for the coin string and returns it as an array or null if error
		var coins = null, tmpcoins = {cp:0,sp:0,ep:0,gp:0,pp:0},
		regex = /[:]+/i,
		cmdString = cmds.toString().replace(/,/g, "").replace(/\s+([cp|sp|ep|gp|pp])/gi, '$1').split(/\s+/);
		if (regex.test(cmds)) {
			// Coins sent as cp:sp:ep:gp:pp
			_.each(cmdString, function (cmd) {
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
			_.each(cmdString, function (cmd) {
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

	hasPurse = function (id) {
		// Returns whether the provided character has been setup with the correct attributes
		var result = true;
        _.each(attributes, function(attribute) {
            var curAttr = findObjs({
                _type: 'attribute',
                characterid: id,
                name: attribute
            }, {caseInsensitive: true})[0];
            if (!curAttr) {
                result = false;
            }
        });

		return result;
	},

	hasEquip = function (id) {
		// Returns whether the provided character has been setup with the 3.0 equipment attribute
		var result = true;
        var equipPurse = findObjs({
            _type: 'attribute',
            characterid: id,
            name: 'pursestrings_purse_id'
        }, {caseInsensitive: true})[0];
        if (!equipPurse) result = false;
		return result;
	},

	getPurse = function (char_id) {
		// Returns an array holding the given character's Purse currency
		var purse = [];
		if (hasPurse(char_id)) {
			purse['cp'] = parseInt(getAttrByName(char_id, attributes['cp'])) || 0;
			purse['sp'] = parseInt(getAttrByName(char_id, attributes['sp'])) || 0;
			purse['ep'] = parseInt(getAttrByName(char_id, attributes['ep'])) || 0;
			purse['gp'] = parseInt(getAttrByName(char_id, attributes['gp'])) || 0;
			purse['pp'] = parseInt(getAttrByName(char_id, attributes['pp'])) || 0;
		} else {
			purse = null;
		}

		return purse;
	},

	changePurse = function (pockets, char_id, type='add') {
		// Add or subtract from a character's Purse
		var result = true;
		if (hasPurse(char_id)) {
			var coins = parseCoins(pockets);
			if (coins) {
				var purse = getPurse(char_id);

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

				var cp = findObjs({ type: 'attribute', characterid: char_id, name: attributes['cp'] })[0];
				var sp = findObjs({ type: 'attribute', characterid: char_id, name: attributes['sp'] })[0];
				var ep = findObjs({ type: 'attribute', characterid: char_id, name: attributes['ep'] })[0];
				var gp = findObjs({ type: 'attribute', characterid: char_id, name: attributes['gp'] })[0];
				var pp = findObjs({ type: 'attribute', characterid: char_id, name: attributes['pp'] })[0];

				cp.set('current', purse['cp']);
				sp.set('current', purse['sp']);
				ep.set('current', purse['ep']);
				gp.set('current', purse['gp']);
				pp.set('current', purse['pp']);

                updateCoinWeight(char_id);
			} else {
				result = false;
				sendChat('PurseStrings', '/w GM No coinage was indicated or coinage syntax was incorrect', null, {noarchive:true});
			}
		} else {
			result = false;
            var character = getObj('character', char_id);
            if (character) {
                sendChat('PurseStrings', '/w GM ' + character.get('name') + ' has not been set up for PurseStrings! Please use !ps --setup', null, {noarchive:true});
            }
		}
		return result;
	},

	showDialog = function (title, name, content, player, whisper=true) {
		// Outputs a 5e Shaped dialog box
        var dialogStr = '&{template:5e-shaped} {{title=' + title + '}} {{content=' + content + '}}';
        var whisperTo = '', gm = /\(GM\)/i;
        whisperTo = gm.test(player) ? 'GM' : '"' + player + '"'

        if (name !== '') {
            dialogStr += ' {{show_character_name=1}} {{character_name=' + name + '}}';
        }

        if (whisper) {
            sendChat('PurseStrings', '/w ' + whisperTo + ' ' + dialogStr);
        } else {
            sendChat('PurseStrings', dialogStr);
        }
	},

	adminDialog = function (title, content) {
		// Outputs a 5e Shaped dialog box strictly for GM
        var message = '/w GM &{template:5e-shaped} {{title=' + title + '}} {{content=' + content + '}}';
        sendChat('PurseStrings', message, null, {noarchive:true});
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

    addShowPurse = function (char_id) {
        // Adds an ability to the character during setup for the --show command
        var abilities = findObjs({
            name: 'ShowPurse',
            type: 'ability',
            characterid: char_id
        })[0];

        if (!abilities) {
            var spmacro = createObj("ability", {
                name: 'ShowPurse',
                characterid: char_id,
                action: '!ps --show --whisper',
                istokenaction: true
            });
        }

    },

    addCoinPurse = function (char_id) {
        // Add an Equipment item for encumbrance of coin weight
        const data = {};
        var coinPurse = {
          content: 'Container for PurseStrings script. DO NOT modify or delete!',
          name: 'CoinPurse',
          type: 'Adventuring Gear',
          weight: 0
        };
        var RowID = generateRowID();
        var repString = 'repeating_equipment_' + RowID;
        Object.keys(coinPurse).forEach(function (field) {
          data[repString + '_' + field] = coinPurse[field];
        });
        setAttrs(char_id, data);

        var purseID = createObj('attribute', {
            characterid: char_id,
            name: 'pursestrings_purse_id',
            current: RowID
        });
    },

    updateCoinWeight = function (char_id) {
        // Update the CoinPurse equipment item with the total weight of all coins
        var purseID = findObjs({type: 'attribute', characterid: char_id, name: 'pursestrings_purse_id'}, {caseInsensitive: true})[0];
        if (purseID) {
            var coins = getPurse(char_id);
            var totalWeight = ((coins['cp'] + coins['sp'] + coins['ep'] + coins['gp'] + coins['pp']) * 0.02).toFixed(2);

            var coinPurse = findObjs({type: 'attribute', characterid: char_id, name: 'repeating_equipment_' + purseID.get('current') + '_weight'})[0];
            if (coinPurse) {
                coinPurse.setWithWorker('current', totalWeight);
            } else {
                sendChat('PurseStrings', '/w GM Could not find "repeating_equipment_' + purseID.get('current') + '_weight!"', null, {noarchive:true});
            }
        } else {
            sendChat('PurseStrings', '/w GM Could not find Purse ID!', null, {noarchive:true});
        }
    },

    whispers = function (cmds) {
        // Returns whether or not "--whisper" was sent
        var result = false, regex = /\-\-whisper/i,
        cmdString = cmds.toString().split(/\s+/);

        if (regex.test(cmds)) {
            result = true;
        }

        return result;
    },

    getItemDesc = function (msg) {
        //Returns the item description sent with the commandBuy command
        var desc = '', pos = msg.content.search(/item\|/i);
        if (pos >= 0) {
            desc = msg.content.slice(pos + 5);
        }
        return HE(desc);
    },

    decodeEditorText = function (t, o) {
        // Strips the editor encoding from GMNotes (thanks to The Aaron!)
        let w = t;
        o = Object.assign({ separator: '\r\n', asArray: false }, o);
        /* Token GM Notes */
        if (/^%3Cp%3E/.test(w)) {
            w = unescape(w);
        }
        if (/^<p>/.test(w)) {
            let lines = w.match(/<p>.*?<\/p>/g).map( l => l.replace(/^<p>(.*?)<\/p>$/,'$1'));
            return o.asArray ? lines : lines.join(o.separator);
        }
        /* neither */
        return t;
    },

    esRE = function (s) {
        var escapeForRegexp = /(\\|\/|\[|\]|\(|\)|\{|\}|\?|\+|\*|\||\.|\^|\$)/g;
        return s.replace(escapeForRegexp,"\\$1");
    },

    HE = (function() {
        var entities={
                //' ' : '&'+'nbsp'+';',
                '<' : '&'+'lt'+';',
                '>' : '&'+'gt'+';',
                "'" : '&'+'#39'+';',
                '@' : '&'+'#64'+';',
                '{' : '&'+'#123'+';',
                '|' : '&'+'#124'+';',
                '}' : '&'+'#125'+';',
                '[' : '&'+'#91'+';',
                ']' : '&'+'#93'+';',
                '"' : '&'+'quot'+';'
            },
            re = new RegExp('('+_.map(_.keys(entities),esRE).join('|')+')','g');
        return function(s){
            return s.replace(re, function(c){ return entities[c] || c; });
        };
    }()),

    generateUUID = (function () {
        "use strict";
        var a = 0, b = [];
        return function() {
            var c = (new Date()).getTime() + 0, d = c === a;
            a = c;
            for (var e = new Array(8), f = 7; 0 <= f; f--) {
                e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
                c = Math.floor(c / 64);
            }
            c = e.join("");
            if (d) {
                for (f = 11; 0 <= f && 63 === b[f]; f--) {
                    b[f] = 0;
                }
                b[f]++;
            } else {
                for (f = 0; 12 > f; f++) {
                    b[f] = Math.floor(64 * Math.random());
                }
            }
            for (f = 0; 12 > f; f++){
                c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
            }
            return c;
        };
    }()),

    generateRowID = function () {
        "use strict";
        return generateUUID().replace(/_/g, "Z");
    },

    upgradeNeeded = function () {
        var needsUpgrade = false;
        var chars = findObjs({ _type: 'character', archived: false });
        _.each(chars, function(char) {
            var char_id = char.get('id');
            if (hasPurse(char_id) && !hasEquip(char_id)) {
                needsUpgrade = true;
            }
        });
        return needsUpgrade;
    },

    commandUpgrade = function () {
        var count = 0, chars = findObjs({ _type: 'character', archived: false });
        _.each(chars, function(char) {
            var char_id = char.get('id');
            if (hasPurse(char_id) && !hasEquip(char_id)) {
                addCoinPurse(char_id);
                updateCoinWeight(char_id);
                count++;
            }
        });
        sendChat('PurseStrings', '/w GM &{template:5e-shaped} {{title=Upgrade Successful}} {{content=' + count
        + ' PurseStrings-enabled character(s) were successfully upgraded to the current version.}}', null, {noarchive:true});
    },

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers
	};
}());

on("ready", function () {
    'use strict';
	PurseStrings.checkInstall();
    PurseStrings.registerEventHandlers();
});
