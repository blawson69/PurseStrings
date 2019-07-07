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

    var version = '4.0',
	attributes = {cp:'pursestrings_cp',sp:'pursestrings_sp',ep:'pursestrings_ep',gp:'pursestrings_gp',pp:'pursestrings_pp'},
    debugMode = false,
    styles = {
        list:  'list-style-type: circle; margin-left: 4px; list-style-position: inside;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 6px 9px; color: #fff; text-align: center;',
        buttonWrapper: 'text-align: center; margin: 14px 0 10px 0; clear: both;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #8e342a; text-decoration: underline;',
        bigger: 'font-size: 1.125em; font-weight: bold; margin-right: 3px;',
        unavail: 'color: #636363; font-style: italic;', right: 'float: right;',
        code: 'font-family: "Courier New", Courier, monospace; font-size: 1.25em; padding-bottom: 6px;'
    },

    checkInstall = function () {
        if (!_.has(state, 'PURSESTRINGS')) state['PURSESTRINGS'] = state['PURSESTRINGS'] || {};
        if (typeof state['PURSESTRINGS'].partyMembers == 'undefined') state['PURSESTRINGS'].partyMembers = [];
        if (typeof state['PURSESTRINGS'].dropChange == 'undefined') state['PURSESTRINGS'].dropChange = false;
        if (typeof state['PURSESTRINGS'].showStock == 'undefined') state['PURSESTRINGS'].showStock = true;
        log('--> PurseStrings v' + version + ' <-- Initialized');

        if (debugMode) {
            var d = new Date();
            adminDialog('Debug Mode', 'PurseStrings v' + version + ' loaded at ' + d.toLocaleTimeString() + '<br><a href="!ps --config">Show config</a>');
        }

        if (typeof state['PURSESTRINGS'].merchWarning == 'undefined') {
            state['PURSESTRINGS'].merchWarning = true;
            var merchWarning = ' This version of PurseStrings contains a <b>significant</b> update to the Merchant Inventory system and the syntax for the <i>--give</i> and <i>--buy</i> commands. If you have used a previous version of this script, you will need to make changes to all Merchant-related characters and/or macros you may be using.<br><br>See the <a href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more information.';
            adminDialog('Merchant Update Notice', merchWarning);
        }

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
                        commandHelp(msg);
				}
			} else {
				commandHelp(msg);
			}
		}
    },

    commandSetup = function (msg) {
		// Setup character for using PurseStrings
		if (!msg.selected || !msg.selected.length) {
			adminDialog('Setup Error', 'No tokens are selected!');
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
						adminDialog('Setup Error', 'PurseString attributes already exist for ' + character.get('name') + '!');
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
    },

    commandHelp = function (msg) {
        // Help dialog with list of commands and a link to the Config Menu for GM
        var message;
        if (playerIsGM(msg.playerid)) {
            message = '<span style=\'' + styles.code + '\'>!ps --help</span><br>Sends this Help dialog to the chat window.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --setup</span><br>Set up selected character(s) for use with PurseStrings. <i>GM only</i>.<br><br>'
            + '<span style=\'' + styles.code + '\'b>!ps --setup 15gp</span><br>Set up selected character(s) and add 15gp startup coins. <i>GM only</i>.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --show</span><br>Show selected character(s) Purse in the chat window.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --show --whisper</span><br>Whisper selected character(s) Purse in the chat window.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --dist 500cp 300sp 100gp</span><br>Distributes 500cp, 300sp, and 100gp evenly between Party Members. <i>GM only</i>.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --add 15gp</span><br>Add 15gp to the selected character(s) Purse. <i>GM only</i>.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --subt 15gp</span><br>Remove 15gp from the selected character(s) Purse. <i>GM only</i>.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --give --giver|&#60;giver_id&#62; --taker|&#60;taker_id&#62; --amt|15gp</span><br>Giver gives 15gp to Taker.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --buy --buyer|&#60;buyer_id&#62; --seller|&#60;merchant_id&#62; --amt|15gp --item|Dagger</span><br>PC buys a Dagger for 15gp.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --buy --buyer|&#60;merchant_id&#62; --seller|&#60;seller_id&#62; --amt|7gp --item|Dagger~Weapons</span><br>PC sells a Dagger to Merchant for 7gp.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --invlist &#60;merchant_id&#62;</span><br>Show Merchant inventory list in chat window. <i>GM only</i>.<br><br>'
            + 'See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more details.'
            + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --config">CONFIG MENU</a></div>';
            adminDialog('PurseStrings Help', message);
        } else {
            message = '<span style=\'' + styles.code + '\'>!ps --help</span><br>Sends this Help dialog to the chat window.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --show</span><br>Shows your Purse in the chat window. Requires selected character\'s token.<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --show --whisper</span><br>Whispers your Purse to yourself in the chat window. Requires selected character\'s token(s).<br><br>'
            + '<span style=\'' + styles.code + '\'>!ps --give --giver|&#60;giver_id&#62; --taker|&#60;taker_id&#62; --amt|15gp</span><br>Giver gives 15gp to Taker.';
            showDialog('PurseStrings Help', '', message, msg.who, true);
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
        var message = '<span style=\'' + styles.bigger + '\'>Leftover loot</span> is currently set to be ';
        if (state['PURSESTRINGS'].dropChange) {
            message += 'dropped for non-random distribution. <a style=\'' + styles.textButton + '\' href="!ps --drop false">Change</a>';
        } else {
            message += 'given to a random Party Member. <a style=\'' + styles.textButton + '\' href="!ps --drop true">Change</a>';
        }

        message += '<br><br><span style=\'' + styles.bigger + '\'>Merchant stock</span> is currently set to be ';
        if (state['PURSESTRINGS'].showStock) {
            message += 'shown to players, with "out of stock" items being labeled as such. <a style=\'' + styles.textButton + '\' href="!ps --stock false">Change</a>';
        } else {
            message += 'hidden from players, with "out of stock" items not being displayed in the list. <a style=\'' + styles.textButton + '\' href="!ps --stock true">Change</a>';
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
        message += 'To add one or more characters to the Party Members list, select their token(s) and <a style=\'' + styles.textButton + '\' href="!ps --party">click here</a>.<br><br>';

        message += 'See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more details.'
        + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --help">HELP MENU</a></div>';
        adminDialog('Settings', message);
    },

	commandAdd = function (msg) {
		if(!msg.selected || !msg.selected.length){
			adminDialog('Add Coinage Error', 'No tokens are selected!');
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
			adminDialog('Subtract Coinage Error', 'No tokens are selected!');
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
			adminDialog('Show Purse Error', 'No tokens are selected!');
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
					content += '<br>Total weight of coins: ' + (total * 0.02).toFixed(0) + ' lbs.';

					showDialog('Purse Contents', character.get('name'), content, msg.who, whispers(msg.content));
				}
			}
		});
	},

	commandBuy = function (msg) {
        // !ps --buy --buyer|<buyer_id> --seller|<seller_id> --amt|50gp --item|Dagger~Weapons
        // !ps --give  --giver|<giver_id> --taker|<taker_id> --amt|50gp
        var rb = /\-\-(buyer|giver)\|/gi, rs = /\-\-(seller|taker)\|/gi, ri = /\-\-item\|/gi, ra = /\-\-amt\|/gi,
        buyer_token_id, seller_token_id, buyer_token_name = '', seller_token_name = '', amount = '';
        var seller, buyer, merchant_name = '', item = '', rx = /\-\-give/gi, commands = msg.content.split('--');
        var giving = (rx.test(msg.content)) ? true : false;

        if (rb.test(msg.content)) buyer_token_id = _.find(commands, function (tmpStr) { return (tmpStr.startsWith('buyer|') || tmpStr.startsWith('giver|')); }).split('|')[1].trim();
        if (rs.test(msg.content)) seller_token_id = _.find(commands, function (tmpStr) { return (tmpStr.startsWith('seller|') || tmpStr.startsWith('taker|')); }).split('|')[1].trim();
        if (ra.test(msg.content)) amount = _.find(commands, function (tmpStr) { return tmpStr.startsWith('amt|'); }).split('|')[1].trim();
        if (ri.test(msg.content)) item = _.find(commands, function (tmpStr) { return tmpStr.startsWith('item|'); }).split('|')[1].trim();

		if (buyer_token_id) {
            let buyer_token = getObj('graphic', buyer_token_id);
            if (buyer_token) {
                buyer_token_name = buyer_token.get('name');
                buyer = getObj('character', buyer_token.get('represents'));
            }
        }
		if (seller_token_id) {
            let seller_token = getObj('graphic', seller_token_id);
            if (seller_token) {
                seller_token_name = seller_token.get('name');
                seller = getObj('character', seller_token.get('represents'));
            }
        }

		if (buyer && hasPurse(buyer.get('id')) && seller && hasPurse(seller.get('id'))) {
            var purchased = changePurse(amount, buyer.get('id'), 'subt');
            if (purchased) {
                var sold = changePurse(amount, seller.get('id'), 'add');
                if (sold) {
                    var desc = item.split('~')[0].trim();
                    if (giving) {
                        showDialog('Transaction Successful', seller.get('name'), 'You received ' + amount + ' from ' + buyer.get('name') + '.', seller.get('name'), true);
                        showDialog('Transaction Successful', buyer.get('name'), 'You gave ' + amount + ' to ' + seller.get('name') + '.', buyer.get('name'), true);
                    } else {
                        if (isMerchant(buyer_token_id)) {
                            updateInventory(buyer_token_id, item, amount, 'add');
                            adminDialog('Purchase Successful', buyer_token_name + ' paid ' + seller.get('name') + ' ' + amount + ' for one ' + desc + '.');
                        } else {
                            showDialog('Purchase Successful', buyer.get('name'), 'You paid ' + seller_token_name + ' ' + amount + ' for one ' + desc + '.', buyer.get('name'), true);
                        }

                        if (isMerchant(seller_token_id)) {
                            updateInventory(seller_token_id, item, amount, 'remove');
                            adminDialog('Sale Successful', buyer.get('name') + ' bought one ' + desc + ' from ' + seller_token_name + ' for ' + amount + '.');
                        } else {
                            showDialog('Sale Successful', seller.get('name'), buyer_token_name + ' paid you ' + amount + ' for one ' + desc + '.', seller.get('name'), true);
                        }
                    }
                }
            } else {
                showDialog('Purchase Error', buyer.get('name'), 'You don\'t have enough money for that transaction!', buyer.get('name'), true);
            }

		} else {
            var errMsg2 = giving ? 'You must have a giver and a receiver to exchange money!' : 'You must have a buyer and a seller to do business!';
            adminDialog('Transaction Error', errMsg2);
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
                    adminDialog('Distribution Error', '"' + id + '" is an invalid ID.');
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
                        adminDialog('Distribution Error', 'Could not add leftovers to ' + luckyOne.get('name') + '.');
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
        var merchant, token_id = '', showStock = state['PURSESTRINGS'].showStock, commands = msg.split(/\s+/);
		if (commands[2] && commands[2] !== '') {
            token_id = commands[2];
            var token = getObj('graphic', token_id);
            if (token) {
                if (token.get('bar1_value').trim() == 'show-stock') showStock = true;
                if (token.get('bar1_value').trim() == 'hide-stock') showStock = false;
                merchant = getObj('character', token.get('represents'));
                if (merchant && hasPurse(merchant.get('id'))) {
                    var notes = decodeEditorText(token.get('gmnotes'), {asArray:true});
                    if (notes && notes[0].match(/^PurseStrings (Inventory|Menu)$/) !== null) {
                        var label = notes[0].replace('PurseStrings ', '');
                        notes.shift();
                        var invList = '&{template:5e-shaped} {{title=' + token.get('name') + '\'s ' + label + '}} {{content=';
                        var inv = parseInventory(notes);
                        if (inv && inv.length > 0) {
                            var cats = _.uniq(_.pluck(inv, 'category'));
                            _.each(cats, function (cat) {
                                invList += '<b style="font-size: 1.25em;">' + cat + '</b><ul style="' + styles.list + '">';
                                let thisCat = _.filter(inv, function (item) { return item.category == cat; });
                                _.each(thisCat, function (item) {
                                    if (showStock === true) {
                                        if (item.quantity !== 0 && item.quantity !== '0') {
                                            let quant = (item.quantity == -1 || item.quantity == '') ? '' : ' <span style=\'' + styles.right + '\'>(' + item.quantity + ' available)</span>'
                                            invList += '<li><a style=\'' + styles.textButton + '\' href="!ps --buy --buyer|&#64;&lbrace;selected|token_id&rbrace; --seller|' + token_id + ' --amt|' + item.price + ' --item|' +  item.name + '"><b>' + item.name + '</b></a> - ' +  item.price + quant + '</li>';
                                        } else {
                                            invList += '<li><b style=\'' + styles.unavail + '\'>' +  item.name + '</b> <span style=\'' + styles.right + '\'><i>out of stock</i></span></li>';
                                        }
                                    } else {
                                        if (item.quantity !== 0 && item.quantity !== '0') {
                                            invList += '<li><a style=\'' + styles.textButton + '\' href="!ps --buy --buyer|&#64;&lbrace;selected|token_id&rbrace;  --seller|' + token_id + ' --amt|' + item.price + ' --item|' +  item.name + '"><b>' +  item.name + '</b></a> - ' + item.price + '</li>';
                                        }
                                    }
                                });
                                invList += '</ul>';
                            });
                        } else {
                            invList += '<i>No inventory found!</i>';
                        }
                        invList += '}} ';

                        if (whispers(msg)) sendChat(token.get('name'), '/w GM ' + invList, null, {noarchive:true});
                        else sendChat(token.get('name'), invList);
                    } else {
                        adminDialog('Inventory Error', 'Merchant has no inventory!');
                    }

                } else {
                    adminDialog('Inventory Error', 'Merchant does not represent a character set up for PurseStrings!');
                }
            } else {
                adminDialog('Inventory Error', 'Not a valid token!');
            }
        } else {
            adminDialog('Inventory Error', 'No Merchant ID sent!');
        }
    },

    updateInventory = function (token_id, desc, price, action) {
        //Updates the inventory for a Merchant
        var label, desc = desc.split('~'), token = getObj('graphic', token_id), add = (action == 'add') ? true : false;
        if (token) {
            var notes = decodeEditorText(token.get('gmnotes'), {asArray:true});
            var merchant = getObj('character', token.get('represents'));
            if (notes && merchant && hasPurse(merchant.get('id'))) {
                label = notes[0].replace('PurseStrings ', '');
                notes.shift();
                var inv = parseInventory(notes);
                var found = _.find(inv, function(item) { return item.name == desc[0]; });
                if (found) {
                    _.each(inv, function (item) {
                        if (item.name == desc[0] && typeof item.quantity === 'number') {
                            item.quantity = add ? item.quantity += 1 : item.quantity -= 1;
                            if (item.quantity < 0) item.quantity = 0;
                        }
                    });
                } else {
                    var cat = (desc[1]) ? desc[1].trim() : 'Uncategorized';
                    var newItem = {name: desc[0], category: cat, quantity: 1, price: doublePrice(price)};
                    inv.push(newItem);
                }

                var cats = _.uniq(_.pluck(inv, 'category')),
                newNotes = '<p>PurseStrings ' + label + '</p>';
                _.each(cats, function (cat) {
                    newNotes += '<p>' + cat + '</p>';
                    let thisCat = _.filter(inv, function (item) { return item.category == cat; });
                    _.each(thisCat, function (item) {
                        newNotes += '<p>' + item.name + '|' + item.price + '|' + item.quantity + '</p>';
                    });
                });
                token.set('gmnotes', newNotes);

                setTimeout(function () {
                    commandInventory('!ps --invlist ' + token_id);
                }, 250);
            } else {
                adminDialog('Inventory Error', 'Merchant does not represent a character set up for PurseStrings!');
            }
        } else {
            adminDialog('Inventory Error', 'Not a valid token!');
        }
    },

    parseInventory = function (notesArray) {
        // Parses the array from the GM Notes of a Merchant and returns an Inventory Object
        // Item Name|price|quantity
        var inv = [], cats = ['Uncategorized'];
        _.each(notesArray, function(line) {
            line = line.trim();
            if (line.search(/\|/) > 0) {
                let item = {}, a = line.split(/\s*\|\s*/);
                item.category = _.last(cats);
                item.name = a[0];
                item.price = a[1];
                if (a[2] != '' && !isNaN(a[2])) {
                    item.quantity = parseInt(a[2]);
                } else {
                    item.quantity = '';
                }
                inv.push(item);
            } else {
                if (line.length > 0) cats.push(line);
            }
        });
        return inv;
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

    doublePrice = function (price) {
        // Returns double the given price
        var newPrice, px = /\d+\s*(cp|sp|ep|gp|pp)/gi;
        if (px.test(price)) {
            var number = parseInt(price);
            var denom = price.replace(/\d+\s*/g, '');
            newPrice = (number * 2) + denom;
        }
        return newPrice;
    },

    isMerchant = function (token_id) {
        var isMerch = false;
        var token = getObj('graphic', token_id);
        if (token) {
            var char = getObj('character', token.get('represents'));
            var notes = decodeEditorText(token.get('gmnotes'), {asArray:true});
            if (typeof char !== 'undefined' && typeof notes == 'object' && notes[0].match(/^PurseStrings (Inventory|Menu)$/) !== null) {
                isMerch = true;
            }
        }
        return isMerch;
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
        // Returns boolean result
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
												adminDialog('Change Purse Error', 'Not enough coinage to cover ' + coins['pp'] + 'pp?');
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
												adminDialog('Change Purse Error', '/w GM Not enough coinage to cover ' + coins['gp'] + 'gp?');
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
												adminDialog('Change Purse Error', 'Not enough coinage to cover ' + coins['ep'] + 'ep?');
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
												adminDialog('Change Purse Error', 'Not enough coinage to cover ' + coins['sp'] + 'sp?');
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
												adminDialog('Change Purse Error', 'Not enough coinage to cover ' + coins['cp'] + 'cp?');
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
				adminDialog('Change Purse Error', 'No coinage was indicated or coinage syntax was incorrect.');
			}
		} else {
			result = false;
            var character = getObj('character', char_id);
            if (character) {
                adminDialog('PurseStrings Error', character.get('name') + ' has not been set up for PurseStrings! Please use !ps --setup');
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
            type: 'ADVENTURING_GEAR',
            toggle_details: 0,
            content_toggle: '1',
            weight_system: 'POUNDS',
            weight: 0,
            weight_total: 0
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
            var pID = purseID.get('current');
            var coins = getPurse(char_id);
            var totalWeight = ((coins['cp'] + coins['sp'] + coins['ep'] + coins['gp'] + coins['pp']) * 0.02).toFixed(0);

            var coinPurse = findObjs({type: 'attribute', characterid: char_id, name: 'repeating_equipment_' + pID + '_weight'})[0];
            if (coinPurse) {
                coinPurse.setWithWorker('current', totalWeight);
            } else {
                adminDialog('Update Coin Weight Error', 'Could not find "repeating_equipment_' + pID + '_weight!"');
            }

            // Trigger the sheet workers to recalculate the total weight of all equipment
            var coinPursePU = findObjs({type: 'attribute', characterid: char_id, name: 'repeating_equipment_' + pID + '_carried'})[0];
            if (coinPursePU) {
                coinPursePU.setWithWorker('current', 1);
                setTimeout(function () {
                    coinPursePU.set('current', 'on');
                }, 250);
            }
        } else {
            adminDialog('Update Coin Weight Error', 'Could not find Purse ID!');
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
        adminDialog('Upgrade Successful', count + ' PurseStrings-enabled character(s) were successfully upgraded to the current version.');
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
