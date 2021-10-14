/*
PurseStrings
A currency and merchant inventory management system for Roll20.

On Github:	https://github.com/blawson69/PurseStrings
Contact me: https://app.roll20.net/users/1781274/ben-l

Like this script? Buy me a coffee:
    https://venmo.com/theRealBenLawson
    https://paypal.me/theRealBenLawson
*/

var PurseStrings = PurseStrings || (function () {
    'use strict';

    //---- INFO ----//

    var version = '6.0.1',
    debugMode = false,
    styles = {
        box:  'background-color: #fff; border: 1px solid #000; padding: 8px 10px; border-radius: 6px;',
        title: 'padding: 0 0 10px 0; color: ##591209; font-size: 1.5em; font-weight: bold; font-variant: small-caps; font-family: "Times New Roman",Times,serif;',
        subtitle: 'margin-top: -4px; padding-bottom: 4px; color: #666; font-size: 1.25em; font-variant: small-caps;',
        list:  'list-style-type: circle; margin-left: 4px; list-style-position: inside;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 6px 9px; color: #fff; text-align: center;',
        buttonWrapper: 'text-align: center; margin: 14px 0 10px 0; clear: both;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #8e342a; text-decoration: underline;',
        bigger: 'font-size: 1.125em; font-weight: bold; margin-right: 3px;',
        unavail: 'color: #636363; font-style: italic;', right: 'float: right; height: 1.125em;',
        fixedShow: 'max-width: 130px; height: 1.125em; vertical-align: text-bottom; padding: 0; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
        fixedHide: 'max-width: 180px; height: 1.125em; padding: 0; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
        alert: 'color: #C91010; text-align: center; border: 1px solid #B31D1D; border-radius: 7px; padding: 6px 3px 0; margin-bottom: 12px;',
        code: 'font-family: "Courier New", Courier, monospace; font-size: 1.25em; padding-bottom: 6px;'
    },
    DENOMINATIONS = ['cp','sp','ep','gp','pp'],

    checkInstall = function () {
        if (!_.has(state, 'PURSESTRINGS')) state['PURSESTRINGS'] = state['PURSESTRINGS'] || {};
        if (typeof state['PURSESTRINGS'].partyMembers == 'undefined') state['PURSESTRINGS'].partyMembers = [];
        if (typeof state['PURSESTRINGS'].showStock == 'undefined') state['PURSESTRINGS'].showStock = true;
        if (typeof state['PURSESTRINGS'].recPurchases == 'undefined') state['PURSESTRINGS'].recPurchases = true;
        if (typeof state['PURSESTRINGS'].useExtScripts == 'undefined') state['PURSESTRINGS'].useExtScripts = true;
        if (typeof state['PURSESTRINGS'].sheet == 'undefined') state['PURSESTRINGS'].sheet = detectSheet();

        log('--> PurseStrings v' + version + ' <-- Initialized');

        if (debugMode) {
            var d = new Date();
            adminDialog('Debug Mode', 'PurseStrings v' + version + ' loaded at ' + d.toLocaleTimeString() + '<br><a style=\'' + styles.textButton + '\' href="!ps --config">Show config</a>');
        }
    },

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!ps')) {
			var parms = msg.content.split(/\s+/i);
			if (parms[1]) {
				switch (parms[1]) {
					case '--setup':
						if (playerIsGM(msg.playerid)) commandSetup(msg);
						break;
					case '--add':
						if (playerIsGM(msg.playerid)) commandAdd(msg);
						break;
					case '--dist':
						if (playerIsGM(msg.playerid)) commandDist(msg.content, false);
						break;
					case '--subt':
						if (playerIsGM(msg.playerid)) commandSubt(msg);
						break;
                    case '--drop':
  						if (playerIsGM(msg.playerid)) commandDrop(msg.content);
  						break;
                    case '--stock':
  						if (playerIsGM(msg.playerid)) commandShowStock(msg.content);
  						break;
                    case '--party':
  						if (playerIsGM(msg.playerid)) commandParty(msg);
  						break;
                    case '--config':
  						if (playerIsGM(msg.playerid)) commandConfig(msg.content);
  						break;
                    case '--invlist':
  						if (playerIsGM(msg.playerid)) commandInventory(msg.content);
  						break;
                    case '--sheet':
  						if (playerIsGM(msg.playerid)) commandSheet(msg.content);
  						break;
                    case '--update-merchant':
  						if (playerIsGM(msg.playerid)) commandUpdateMerch(msg.selected);
  						break;
                    case '--give':
					case '--buy':
						commandBuy(msg);
						break;
					case '--show':
						commandShow(msg);
						break;
					case '--convert':
						commandConvert(msg);
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

                    //if (!isPursed(char_id)) {
                    //}
                    _.each(DENOMINATIONS, function (denom) {
                        validateDenomination(char_id, denom);
                    });

                    var message = '<b>Success!</b><br>PurseStrings setup is complete for ' + character.get('name') + '.';
                    if (addShowPurse(char_id)) {
                        message += ' A "ShowPurse" action was added to enable viewing of their Purse by the controlling player.';
                    }
                    if (isMerchant()) {
                        if (addShowInventory(token.get('id'))) {
                            message += '<br>A "ShowInventory" action was also added to this Merchant.';
                        }
                    }
                    var coins = parseCoins(msg.content);
                    if (coins) {
                        var initpurse = changePurse(msg.content, char_id, 'add');
                        if (initpurse) {
                            message += '<br>Also, ' + prettyCoins(coins, true) + ' have been added to their Purse.';
                        }
                    }

                    adminDialog('Setup Complete', message);
				}
			}
		});
	},

    commandParty = function (msg) {
        // Manage party of characters who will be receiving loot in commandDist
        var message = '', errlist = [], regex = /\-\-reset/i,
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
                if (token && token.get('represents') !== '') {
                    var char_id = token.get('represents');
                    var character = getObj('character', char_id);
                    if (!_.find(state['PURSESTRINGS'].partyMembers, function(id) {return id == char_id;})) {
                        state['PURSESTRINGS'].partyMembers.push(char_id);
                        members.push('<li>' + character.get('name') + '</li>');
                        if (!isPursed(token.get('represents'))) {
                            errlist.push('<li>' + character.get('name') + ' needs to be set up for PurseStrings.</li>')
                        }
                    }
                } else {
                    var char_id = token.get('represents');
                    var character = getObj('character', char_id);
                    errlist.push('<li>' + character.get('name') + ' does not represent a character.</li>');
                }
            });

            if (_.size(members) > 0) {
                message += members.join('');
            }
            message += '</ul>';

            if (_.size(errlist) > 0) {
                if (_.size(members) == 0) message = '';
                message += 'The following errors were encountered on one or more selected tokens:<ul>' + errlist.join('') + '</ul>';
            }
        }
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --config">&#9668; BACK</a></div>';

        adminDialog('Party Members', message);
    },

    commandHelp = function (msg) {
        // Help dialog with list of commands and a link to the Config Menu for GM
        var message = '', isGM = playerIsGM(msg.playerid);
        if (isGM) {
            message += '<span style=\'' + styles.code + '\'>!ps --config</span><br>Sends the Config dialog to the chat window.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --setup</span><br>Set up selected character(s) for use with PurseStrings. <i>GM only</i>.<br><br>';
            message += '<span style=\'' + styles.code + '\'b>!ps --setup 15gp</span><br>Set up selected character(s) and add 15gp startup coins. <i>GM only</i>.<br><br>';
        }
        message += '<span style=\'' + styles.code + '\'>!ps --show</span><br>Show selected character(s) Purse in the chat window.<br><br>';
        message += '<span style=\'' + styles.code + '\'>!ps --show --whisper</span><br>Whisper selected character(s) Purse in the chat window.<br><br>';
        if (isGM) {
            message += '<span style=\'' + styles.code + '\'>!ps --dist 500cp 300sp 100gp</span><br>Distributes 500cp, 300sp, and 100gp evenly between Party Members. <i>GM only</i>.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --add 15gp</span><br>Add 15gp to the selected character(s) Purse. <i>GM only</i>.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --subt 15gp</span><br>Remove 15gp from the selected character(s) Purse. <i>GM only</i>.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --covert gp</span><br>Converts selected character(s) Purse into GP. <i>GM only</i>.<br><br>';
        }
        message += '<span style=\'' + styles.code + '\'>!ps --give --giver|&#60;giver_token_id&#62; --taker|&#60;taker_token_id&#62; --amt|15gp</span><br>Giver gives 15gp to Taker.<br><br>';
        if (isGM) {
            message += '<span style=\'' + styles.code + '\'>!ps --buy --buyer|&#60;buyer_token_id&#62; --seller|&#60;merchant_token_id&#62; --amt|15gp --item|Dagger</span><br>PC buys a Dagger for 15gp.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --buy --buyer|&#60;merchant_token_id&#62; --seller|&#60;seller_token_id&#62; --amt|7gp --item|Dagger~Weapons</span><br>PC sells a Dagger to Merchant for 7gp.<br><br>';
            message += '<span style=\'' + styles.code + '\'>!ps --invlist &#60;merchant_token_id&#62;</span><br>Show Merchant inventory list in chat window. <i>GM only</i>.<br><br>';
            message += 'See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more details.';
            message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --config">CONFIG MENU</a></div>';
        }

        if (isGM) adminDialog('PurseStrings Help', message);
        else showDialog('PurseStrings Help', '', message, msg.who, true);
    },

    commandConfig = function (msg) {
        // Config dialog with links to make changes
        var message = '', parms = msg.trim().split(/\s*\-\-/i);
        _.each(parms, function (x) {
            var parts = x.split(/\s*\|\s*/i);
            if (parts[0] == 'stock') state['PURSESTRINGS'].showStock = !state['PURSESTRINGS'].showStock;
            if (parts[0] == 'np') state['PURSESTRINGS'].recPurchases = !state['PURSESTRINGS'].recPurchases;
            if (parts[0] == 'ext') state['PURSESTRINGS'].useExtScripts = !state['PURSESTRINGS'].useExtScripts;
        });

        if (detectSheet() != state['PURSESTRINGS'].sheet) {
            message += '<div style="' + styles.alert + '">⚠️ You are using the <b>' + state['PURSESTRINGS'].sheet + '</b> sheet but PurseStrings has detected your sheet is the <b>' + detectSheet() + '</b> sheet.<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + ' background-color: #B31D1D;\' href="!ps --sheet ' + detectSheet() + '">FIX SHEET</a></div></div>';
        }
        //message += 'You are using the <b>' + state['PURSESTRINGS'].sheet + '</b> sheet. If this is incorrect, <a style=\'' + styles.textButton + '\' href="!ps --sheet ?{Sheet|5th Edition OGL|5e Shaped}" title="Change sheet">click here</a>.<br><br>';

        message += 'To setup a character with the PurseStrings token actions and to ensure they have the required denominations of coins, select their token(s) and click the button below.';
        message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --setup ?{Startup Money|}" title="Setup selected character(s)">SETUP CHARACTER</a></div>';

        message += '<div style=\'' + styles.title + '\'>Default Settings</div>';
        message += '<span style=\'' + styles.bigger + '\'>Merchant Stock:</span> The quantity of a Merchant\'s Inventory items is set to be ';
        if (state['PURSESTRINGS'].showStock) {
            message += 'shown to players, with "out of stock" items being labeled as such. <a style=\'' + styles.textButton + '\' href="!ps --config --stock|toggle">Change</a><br><br>';
        } else {
            message += 'hidden from players, with "out of stock" items not being displayed in the list. <a style=\'' + styles.textButton + '\' href="!ps --config --stock|toggle">Change</a><br><br>';
        }

        message += '<span style=\'' + styles.bigger + '\'>Recording Purchases:</span> Item purchases from a Merchant ';
        if (state['PURSESTRINGS'].recPurchases) {
            message += 'will automatically be recorded to the character sheet\'s ' + (isShapedSheet() ? 'Miscellaneous Notes' : 'Treasure') + ' field. <a style=\'' + styles.textButton + '\' href="!ps --config --np|toggle">Change</a><br><br>';
            if (useItemDB()) {
                message += '<span style=\'' + styles.bigger + '\'>External Script Integration:</span> Purchased items found in the ItemDB database ' + (state['PURSESTRINGS'].useExtScripts ? 'will' : 'will <i>not</i>') + ' be added to the appropriate section instead of being recorded to the ' + (isShapedSheet() ? 'Miscellaneous Notes' : 'Treasure') + ' field. <a style=\'' + styles.textButton + '\' href="!ps --config --ext|toggle">toggle</a><br><br>';
            }
        } else {
            message += 'will not be recorded automatically on the character sheet. Players will need to record purchases manually. <a style=\'' + styles.textButton + '\' href="!ps --config --np|toggle">toggle</a><br><br>';
        }

        message += '<div style=\'' + styles.title + '\'>Party Members</div>';
        if (_.size(state['PURSESTRINGS'].partyMembers) > 0) {
            message += 'The following characters are in the Party Members list for loot distribution:<br><ul>';
            _.each(state['PURSESTRINGS'].partyMembers, function(char_id) {
                var character = getObj('character', char_id);
                message += '<li>' + character.get('name') + '</li>';
            });
            message += "</ul>";
        } else {
            message += '<b>There are no characters in the Party Members list.</b> ';
        }
        message += 'To add one or more characters to Party Members, select their token(s) and click the button below.<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --party" title="Add selected character(s) to the Party Members list">ADD PARTY MEMBERS</a></div>';
        message += '<br>See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more details.';

        adminDialog('PurseStrings Config', message);
    },

	commandConvert = function (msg) {
		if(!msg.selected || !msg.selected.length){
			adminDialog('Convert Coinage Error', 'No tokens are selected!');
			return;
		}
        var validDenom = /^[s|e|g|p]p$/,
        denom = msg.content.replace('!ps --convert', '').trim().toLowerCase();
        if (!validDenom.test(denom)) {
            adminDialog('Convert Coinage Error', 'Incorrect denomination.');
			return;
        }

		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token && token.get('represents') !== '') {
				var char = getObj('character', token.get('represents'));
                if (char) {
                    var char_id = char.get('id');
                    var purse = getPurse(char_id);
                    if (purse) {
                        var message = '', newPurse = _.clone(purse),
                        index = _.indexOf(DENOMINATIONS, denom);
                        for (var x = 0; x <= index; x++) {
                            if (DENOMINATIONS[x] == 'sp') {
                                newPurse.sp = newPurse.sp + parseInt(newPurse.cp / 10);
                                newPurse.cp = newPurse.cp % 10;
                            }
                            if (DENOMINATIONS[x] == 'ep') {
                                newPurse.ep = newPurse.ep + parseInt(newPurse.sp / 5);
                                newPurse.sp = newPurse.sp % 5;
                            }
                            if (DENOMINATIONS[x] == 'gp') {
                                newPurse.gp = newPurse.gp + parseInt(newPurse.ep / 2);
                                newPurse.ep = newPurse.ep % 2;
                            }
                            if (DENOMINATIONS[x] == 'pp') {
                                newPurse.pp = newPurse.pp + parseInt(newPurse.gp / 10);
                                newPurse.gp = newPurse.gp % 10;
                            }
                        }
                        message += 'The coins in your Purse have been successfully converted to ' + denom.toUpperCase() + '. Your Purse is now:<br>' + prettyCoins(newPurse);
                        message += '<br>Total weight of coins: ' + getCoinWeight(newPurse);
                        _.each(DENOMINATIONS, function (denom) {
                            changeDenomAmt(char_id, denom, newPurse[denom]);
                        });
                        showDialog('Conversion complete', char.get('name'), message, msg.who);
                        adminDialog('Conversion complete', char.get('name') + '\'s Purse has been converted to ' + denom.toUpperCase() + '.<br>Purse: ' + prettyCoins(newPurse));
                    } else {
                        adminDialog('Convert Coins Error', char.get('name') + ' has no purse!');
                    }
                }
			}
		});
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
		// Show one or more individual character's currency
		if(!msg.selected || !msg.selected.length){
			adminDialog('Show Purse Error', 'No tokens are selected!');
			return;
		}
		_.each(msg.selected, function(obj) {
			var token = getObj(obj._type, obj._id);
			if(token) {
				if (token.get('represents') !== '' && isPursed(token.get('represents'))) {
					var character = getObj('character', token.get('represents'));
					var purse = getPurse(character.get('id'));
					var content = prettyCoins(purse, false) + '.';
					content += '<br>Total weight of coins: ' + getCoinWeight(purse);

					showDialog('Purse Contents', character.get('name'), content, msg.who, whispers(msg.content));
				} else {
                    var character = getObj('character', token.get('represents'));
                    showDialog('Purse Contents', '', 'This character has not been setup for PurseStrings! Please talk to your GM.', msg.who, whispers(msg.content));
                    adminDialog('Show Purse Error', character.get('name') + ' has not been set up for PurseStrings!');
                }
			}
		});
	},

	commandBuy = function (msg) {
        // !ps --buy --buyer|<buyer_id> --seller|<seller_id> --amt|50gp --item|Dagger~Weapons
        // !ps --give  --giver|<giver_id> --taker|<taker_id> --amt|50gp
        var rb = /\-\-(buyer|giver)\|/gi, rs = /\-\-(seller|taker)\|/gi, ri = /\-\-item\|/gi, ra = /\-\-amt\|/gi,
        buyer_token_id, seller_token_id, buyer_token_name = '', seller_token_name = '', amount = '';
        var seller, buyer, merchant_name = '', item = '', rx = /\-\-give/gi, commands = msg.content.split(/\s*\-\-/i);
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
            } else if (giving) {
                seller = getObj('character', seller_token_id);
                seller_token_name = seller.get('name');
            }
        }

		if (buyer && isPursed(buyer.get('id')) && seller && isPursed(seller.get('id'))) {
            var purchased = changePurse(amount, buyer.get('id'), 'subt');
            if (purchased) {
                var sold = changePurse(amount, seller.get('id'), 'add');
                if (sold) {
                    var desc = item.split('~')[0].trim();
                    if (giving) {
                        showDialog('Exchange Successful', seller.get('name'), 'You received ' + amount + ' from ' + buyer.get('name') + '.', seller.get('name'), true);
                        showDialog('Exchange Successful', buyer.get('name'), 'You gave ' + amount + ' to ' + seller.get('name') + '.', buyer.get('name'), true);
                        adminDialog('Exchange Successful', buyer.get('name') + ' gave ' + seller.get('name') + ' ' + amount + '.');
                    } else {
                        if (isMerchant(buyer_token_id)) {
                            updateInventory(buyer_token_id, item, amount, 'add');
                            adminDialog('Purchase Successful', buyer_token_name + ' paid ' + seller.get('name') + ' ' + amount + ' for one ' + desc + '.');
                        } else {
                            if (!isService(seller_token_id, desc) && state['PURSESTRINGS'].recPurchases) recordPurchase(buyer_token_id, desc);
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
            var errMsg2 = 'The following errors were encountered:<ul>';
            if (typeof buyer == 'undefined') errMsg2 += '<li>Buyer character was not found.</li>';
            if (buyer && !isPursed(buyer.get('id'))) errMsg2 += '<li>Buyer character is not set up with PurseStrings.</li>';
            if (typeof seller == 'undefined') errMsg2 += '<li>Seller character was not found.</li>';
            if (seller && !isPursed(seller.get('id'))) errMsg2 += '<li>Seller character is not set up with PurseStrings.</li>';
            errMsg2 += '</ul>';
            adminDialog('Transaction Error', errMsg2);
		}
	},

    commandDist = function (msg, external = true) {
		// Distribute loot between selected characters
		var loot = parseCoins(msg), comments = '', recipients = [],
        numParty, partyMembers = state['PURSESTRINGS'].partyMembers;
        numParty = partyMembers.length;
        var retval = true;

		if (loot && numParty > 0) {
            var take = splitTake(loot, numParty);
            _.each(partyMembers, function (id) {
                var member = getObj('character', id);
                if (member) {
                    var changed = changePurse(_.values(take).join(':'), id, 'add');
                    if (changed) {
                        recipients.push(member.get('name'));
                    } else {
                        retval = false;
            			if (!external) adminDialog('Distribution Error', 'Could not give loot to ' + member.get('name') + '.');
                        else log('PurseStrings Error: Could not give loot to ' + member.get('name') + '.');
                    }
                } else {
                    retval = false;
        			if (!external) adminDialog('Distribution Error', '"' + id + '" is an invalid ID.');
                    else log('PurseStrings Error: "' + id + '" is an invalid ID.');
                }
            });

			if (!external) showDialog('Loot Distributed', '', prettyCoins(loot, true) + ' have been successfully distributed between the following Party Members:<br><ul><li>' + recipients.join('</li><li>') + '</li></ul>Each Member has received ' + prettyCoins(take, true) + '.', '', false);
		} else {
            if (numParty == 0) {
                retval = false;
    			if (!external) adminDialog('Distribution Error', 'There are no Party Members to whom you can distribute loot!');
                else log('PurseStrings Error: There are no Party Members to whom you can distribute loot!');
            } else {
                retval = false;
    			if (!external) adminDialog('Distribution Error', 'No coinage was indicated or coinage syntax was incorrect!');
                else log('PurseStrings Error: No coinage was indicated or coinage syntax was incorrect!');
            }
		}
        return retval;
    },

    splitTake = function (loot, count) {
        var take = {cp:0,sp:0,ep:0,gp:0,pp:0},
        tmpLoot = _.clone(loot);

        take.pp = parseInt(tmpLoot.pp / count);
        tmpLoot.gp += (tmpLoot.pp % count) * 10;

        take.gp = parseInt(tmpLoot.gp / count);
        tmpLoot.ep += (tmpLoot.gp % count) * 2;

        take.ep = parseInt(tmpLoot.ep / count);
        tmpLoot.sp += (tmpLoot.ep % count) * 5;

        take.sp = parseInt(tmpLoot.sp / count);
        tmpLoot.cp += (tmpLoot.sp % count) * 10;

        take.cp = parseInt(tmpLoot.cp / count);

        return take;
    },

    recordPurchase = function (token_id, new_item) {
        var token = getObj('graphic', token_id);
        var char = getObj('character', token.get('represents')), purchased, items = '', tmpItems;
        if (char) {
            if (state['PURSESTRINGS'].useExtScripts && useItemDB() && typeof ItemDB.get(new_item) != 'undefined') {
                var added = ItemDB.add(new_item, char.get('id'));
                if (!added.success) log('Add error from PurseStrings: ' + added.err);
            } else {
                var field = findObjs({ type: 'attribute', characterid: char.get('id'), name: (isShapedSheet() ? 'miscellaneous_notes' : 'treasure') })[0];
                if (!field) field = createObj("attribute", {characterid: char.get('id'), name: (isShapedSheet() ? 'miscellaneous_notes' : 'treasure'), current: ''});
                var notes = field.get('current');
                purchased = _.find(notes.split(/\n/), function (x) { return x.startsWith('PURCHASED ITEMS:'); });
                if (purchased) items = purchased.replace('PURCHASED ITEMS:', '').trim();
                items = items.split(/\s*,\s*/);
                tmpItems = denumerateItems(items);
                items = enumerateItems(tmpItems.push(new_item));
                items = _.filter(enumerateItems(tmpItems), function (x) { return x != ''; });
                if (notes.search(/^PURCHASED ITEMS\:\s.*$/m) == -1) {
                    notes = (notes == '') ? 'PURCHASED ITEMS: ' + items.join(', ') : notes + '\n\nPURCHASED ITEMS: ' + items.join(', ');
                } else {
                    notes = notes.replace(/^PURCHASED ITEMS\:\s(.*)$/m, 'PURCHASED ITEMS: ' + items.join(', '));
                }
                field.set({ current: notes });
            }
        } else {
            adminDialog('Record Purchase Error', 'Invalid token ID.');
        }
    },

    denumerateItems = function (items) {
        // Takes an array of enumerated items and expands it by count
        var tmpItems = [], re = /^[^\(]+\(\d+\)$/;
        _.each(items, function (item) {
            if (item.match(re)) {
                var count = item.replace(/^[^\(]+\((\d+)\)$/, '$1');
                for (var x = 0; x < count; x++) {
                    tmpItems.push(item.replace(' (' + count + ')', ''));
                }
            } else {
                tmpItems.push(item);
            }
        });
        return tmpItems;
    },

    enumerateItems = function (items) {
        // Collects multiple instances into one instance with an item count
        var uniqItems, retItems = [], count;
        uniqItems = _.uniq(items);
        _.each(uniqItems, function(item) {
            count = _.size(_.filter(items, function (x) { return x == item; }));
            if (count > 1) retItems.push(item + ' (' + count + ')');
            else retItems.push(item);
        });
        return retItems;
    },

    isService = function (token_id, test_item) {
        var isServ = false, notes, item, token = getObj('graphic', token_id);
        notes = processGMNotes(token.get('gmnotes'));
        item = _.find(notes, function (x) { return x.startsWith(test_item); });
        if (item) {
            item = item.split(/\s*\|\s*/);
            if (item[2] == '') isServ = true;
        }
        return isServ;
    },

    commandInventory = function (msg) {
        //Shows the inventory for a merchant character
        var merchant, token_id = '', showStock = state['PURSESTRINGS'].showStock, commands = msg.split(/\s+/);
		if (commands[2] && commands[2] !== '') {
            token_id = commands[2];
            var token = getObj('graphic', token_id);
            if (token) {
                var bar1 = token.get('bar1_value').toString();
                if (bar1.match(/^show\-stock/i) !== null) showStock = true;
                if (bar1.match(/^hide\-stock/i) !== null) showStock = false;
                merchant = getObj('character', token.get('represents'));
                if (merchant && isPursed(merchant.get('id'))) {
                    var notes = processGMNotes(token.get('gmnotes'));
                    if (notes && notes[0].match(/^PurseStrings (Inventory|Menu)$/) !== null) {
                        var label = notes[0].replace('PurseStrings ', '');
                        notes.shift();
                        var invList = '';
                        var inv = parseInventory(notes);
                        if (inv && inv.length > 0) {
                            var cats = _.uniq(_.pluck(inv, 'category'));
                            _.each(cats, function (cat) {
                                invList += '<b style="font-size: 1.125em;">' + cat + '</b><ul style="' + styles.list + '">';
                                let thisCat = _.filter(inv, function (item) { return item.category == cat; });
                                _.each(thisCat, function (item) {
                                    if (showStock === true) {
                                        if (item.quantity !== 0 && item.quantity !== '0') {
                                            let quant = (item.quantity == -1 || item.quantity == '') ? '' : ' <span style=\'' + styles.right + '\'>(' + item.quantity + ' avail.)</span>'
                                            invList += '<li><span style=\'' + styles.fixedShow + '\'><a style=\'' + styles.textButton + '\' href="!ps --buy --buyer|&#64;&lbrace;selected|token_id&rbrace; --seller|' + token_id + ' --amt|' + item.price + ' --item|' +  item.name + '" title="Buy ' + item.name + '"><b>' + item.name + '</b></a></span> - ' +  item.price + quant + '</li>';
                                        } else {
                                            invList += '<li><span style=\'' + styles.fixedShow + 'cursor: not-allowed;\'><b style=\'' + styles.unavail + '\' title="' + item.name + '">' +  item.name + '</b></span> <span style=\'' + styles.right + '\'><i>out of stock</i></span></li>';
                                        }
                                    } else {
                                        if (item.quantity !== 0 && item.quantity !== '0') {
                                            invList += '<li><span style=\'' + styles.fixedHide + '\'><a style=\'' + styles.textButton + '\' href="!ps --buy --buyer|&#64;&lbrace;selected|token_id&rbrace;  --seller|' + token_id + ' --amt|' + item.price + ' --item|' +  item.name + '" title="Buy ' + item.name + '"><b>' +  item.name + '</b></a></span> - ' + item.price + '</li>';
                                        }
                                    }
                                });
                                invList += '</ul>';
                            });
                        } else {
                            invList += '<i>No inventory found!</i>';
                        }

                        if (whispers(msg)) adminDialog(token.get('name') + '\'s ' + label, invList);
                        else showDialog(token.get('name') + '\'s ' + label, '', invList, '', false);
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
            var notes = processGMNotes(token.get('gmnotes'));
            var merchant = getObj('character', token.get('represents'));
            if (notes && merchant && isPursed(merchant.get('id'))) {
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
                if (merchant.get('name') == token.get('name')) setDefaultTokenForCharacter(merchant, token);

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

    commandUpdateMerch = function (selected) {
        // Updates a merchant character with its default token
        if (!selected || selected.length > 1) {
            adminDialog('Update Merchant Error', 'You may only select one token at a time.');
        } else {
            var merch_token = getObj(selected[0]._type, selected[0]._id);
            if (merch_token) {
                var merch_char = getObj('character', merch_token.get('represents'));
                if (merch_char && isMerchant(merch_token.get('id'))) {
                    setDefaultTokenForCharacter(merch_char, merch_token);
                    adminDialog('Update Successful', 'Merchant ' + merch_char.get('name') + '\'s default token has been updated.');
                }
            }
        }
    },

	parseCoins = function (cmds) {
		// Parses the input for the coin string and returns it as an array or null if error
		var coins, compact = /^\d+:\d+:\d+:\d+:\d+$/i;
        cmds = cmds.toString().toLowerCase().replace(/\!ps\s\-\-[a-z]{3,7}/i, '').replace(/,/g, ' ');
        cmds = cmds.replace(/(\d+)\s+([c|s|e|g|p]p)/gi, '$1$2').trim();
        if (cmds != '') {
            var aCoins = cmds.split(/\s+/);
            coins = {cp:0,sp:0,ep:0,gp:0,pp:0};

            if (compact.test(cmds)) {
                // Coins sent as cp:sp:ep:gp:pp
                var msgcoins = aCoins[0].split(':');
                coins.cp = parseInt(msgcoins[0]);
                coins.sp = parseInt(msgcoins[1]);
                coins.ep = parseInt(msgcoins[2]);
                coins.gp = parseInt(msgcoins[3]);
                coins.pp = parseInt(msgcoins[4]);
            } else {
                // Coins sent as single denominations, e.g. "30cp" or "100sp 32gp"
                var regex = /^\d+[c|s|e|g|p]p$/;
                _.each(aCoins, function (coin) {
                    if (regex.test(coin)) {
                        if (coin.endsWith('cp')) coins.cp = parseInt(coin);
                        if (coin.endsWith('sp')) coins.sp = parseInt(coin);
                        if (coin.endsWith('ep')) coins.ep = parseInt(coin);
                        if (coin.endsWith('gp')) coins.gp = parseInt(coin);
                        if (coin.endsWith('pp')) coins.pp = parseInt(coin);
                    }
                });
            }
        }

		return coins;
    },

    getCoinWeight = function (purse) {
        // Count coins to determine total weight
        var dispWeight, weight, total = purse.cp + purse.sp + purse.ep + purse.gp + purse.pp;
        weight = total * 0.02;
        dispWeight = (weight < 10) ? weight.toFixed(1) + '' : weight.toFixed(0);
        return dispWeight;
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
            var notes = processGMNotes(token.get('gmnotes'));
            if (typeof char !== 'undefined' && typeof notes == 'object' && notes[0].match(/^PurseStrings (Inventory|Menu)$/) !== null) {
                isMerch = true;
            }
        }
        return isMerch;
    },

    isPursed = function (char_id) {
        // Return whether character has minimum required currency fields
        var ids = [];
        _.each(DENOMINATIONS, function (denom) {
            if (isShapedSheet()) {
                var d_id = findDenomID(char_id, denom);
                if (d_id != '') ids.push(d_id);
            } else {
                var what = getAttrByName(char_id, denom, 'current');
                ids.push(what);
            }
        });
        return (_.size(ids) == 5);
    },

	getPurse = function (char_id) {
		// Returns an object holding the given character's Purse currency
		var purse = {cp:0,sp:0,ep:0,gp:0,pp:0},
        char = getObj('character', char_id);
		if (char) {
            _.each(DENOMINATIONS, function (denom) {
                purse[denom] = getDenomAmt(char_id, denom);
            });
		}

		return purse;
	},

	changePurse = function (cmd_content, char_id, type='add') {
		// Add or subtract from a character's Purse
        // Returns boolean result
		var result = true;
		if (isPursed(char_id)) {
			var coins = parseCoins(cmd_content);
			if (coins) {
				var purse = getPurse(char_id);

				if (type == 'add') {
					purse.cp += coins['cp'];
					purse.sp += coins['sp'];
					purse.ep += coins['ep'];
					purse.gp += coins['gp'];
					purse.pp += coins['pp'];
				} else {
					var coinsVal = coins['cp'] + (coins['sp'] * 10) + (coins['ep'] * 50) + (coins['gp'] * 100) + (coins['pp'] * 1000);
					var purseVal = purse.cp + (purse.sp * 10) + (purse.ep * 50) + (purse.gp * 100) + (purse.pp * 1000);

					if (coinsVal > purseVal) {
						result = false;
					} else {
						// platinum pieces
						if (coins['pp'] > 0) {
							if (purse.pp >= coins['pp']) {
								purse.pp -= coins['pp'];
							} else {
								while (purse.pp < coins['pp'] && purse.gp >= 10) {
									purse.pp += 1;
									purse.gp -= 10;
								}
								if (purse.pp >= coins['pp']) {
									purse.pp -= coins['pp'];
								} else {
									while (purse.pp < coins['pp'] && purse.ep >= 20) {
										purse.pp += 1;
										purse.ep -= 20;
									}
									if (purse.pp >= coins['pp']) {
										purse.pp -= coins['pp'];
									} else {
										while (purse.pp < coins['pp'] && purse.sp >= 100) {
											purse.pp += 1;
											purse.sp -= 100;
										}
										if (purse.pp >= coins['pp']) {
											purse.pp -= coins['pp'];
										} else {
											while (purse.pp < coins['pp'] && purse.cp >= 1000) {
												purse.pp += 1;
												purse.cp -= 1000;
											}
											if (purse.pp >= coins['pp']) {
												purse.pp -= coins['pp'];
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
							if (purse.gp >= coins['gp']) {
								purse.gp -= coins['gp'];
							} else {
								while (purse.gp < coins['gp'] && purse.pp > 0) {
									purse.gp += 10;
									purse.pp -= 1;
								}
								if (purse.gp >= coins['gp']) {
									purse.gp -= coins['gp'];
								} else {
									while (purse.gp < coins['gp'] && purse.ep > 2) {
										purse.gp += 1;
										purse.ep -= 2;
									}
									if (purse.gp >= coins['gp']) {
										purse.gp -= coins['gp'];
									} else {
										while (purse.gp < coins['gp'] && purse.sp > 10) {
											purse.gp += 1;
											purse.sp -= 10;
										}
										if (purse.gp >= coins['gp']) {
											purse.gp -= coins['gp'];
										} else {
											while (purse.gp < coins['gp'] && purse.cp > 100) {
												purse.gp += 1;
												purse.cp -= 100;
											}
											if (purse.gp >= coins['gp']) {
												purse.gp -= coins['gp'];
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
							if (purse.ep >= coins['ep']) {
								purse.ep -= coins['ep'];
							} else {
								while (purse.ep < coins['ep'] && purse.gp > 0) {
									purse.ep += 2;
									purse.gp -= 1;
								}
								if (purse.ep >= coins['ep']) {
									purse.ep -= coins['ep'];
								} else {
									while (purse.ep < coins['ep'] && purse.pp > 0) {
										purse.ep += 20;
										purse.pp -= 1;
									}
									if (purse.ep >= coins['ep']) {
										purse.ep -= coins['ep'];
									} else {
										while (purse.ep < coins['ep'] && purse.sp > 5) {
											purse.ep += 1;
											purse.sp -= 5;
										}
										if (purse.ep >= coins['ep']) {
											purse.ep -= coins['ep'];
										} else {
											while (purse.ep < coins['ep'] && purse.cp > 50) {
												purse.ep += 1;
												purse.cp -= 50;
											}
											if (purse.ep >= coins['ep']) {
												purse.ep -= coins['ep'];
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
							if (purse.sp >= coins['sp']) {
								purse.sp -= coins['sp'];
							} else {
								while (purse.sp < coins['sp'] && purse.ep > 5) {
									purse.sp += 5;
									purse.ep -= 1;
								}
								if (purse.sp >= coins['sp']) {
									purse.sp -= coins['sp'];
								} else {
									while (purse.sp < coins['sp'] && purse.gp > 0) {
										purse.sp += 10;
										purse.gp -= 1;
									}
									if (purse.sp >= coins['sp']) {
										purse.sp -= coins['sp'];
									} else {
										while (purse.sp < coins['sp'] && purse.pp > 0) {
											purse.sp += 100;
											purse.pp -= 1;
										}
										if (purse.sp >= coins['sp']) {
											purse.sp -= coins['sp'];
										} else {
											while (purse.sp < coins['sp'] && purse.cp > 10) {
												purse.sp += 1;
												purse.cp -= 10;
											}
											if (purse.sp >= coins['sp']) {
												purse.sp -= coins['sp'];
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
							if (purse.cp >= coins['cp']) {
								purse.cp -= coins['cp'];
							} else {
								while (purse.cp < coins['cp'] && purse.sp > 0) {
									purse.cp += 10;
									purse.sp -= 1;
								}
								if (purse.cp >= coins['cp']) {
									purse.cp -= coins['cp'];
								} else {
									while (purse.cp < coins['cp'] && purse.ep > 0) {
										purse.cp += 50;
										purse.ep -= 1;
									}
									if (purse.cp >= coins['cp']) {
										purse.cp -= coins['cp'];
									} else {
										while (purse.cp < coins['cp'] && purse.gp > 0) {
											purse.cp += 100;
											purse.gp -= 1;
										}
										if (purse.cp >= coins['cp']) {
											purse.cp -= coins['cp'];
										} else {
											while (purse.cp < coins['cp'] && purse.pp > 0) {
												purse.cp += 1000;
												purse.pp -= 1;
											}
											if (purse.cp >= coins['cp']) {
												purse.cp -= coins['cp'];
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

                _.each(DENOMINATIONS, function (denom) {
                    changeDenomAmt(char_id, denom, purse[denom]);
                });
			} else {
				result = false;
				log('PurseStrings: No coinage was indicated or coinage syntax was incorrect.');
			}
		} else {
			result = false;
            var character = getObj('character', char_id);
            if (character) {
                log('PurseStrings: ' + character.get('name') + ' has not been set up for PurseStrings.');
            } else {
                log('PurseStrings: ' + char_id + ' is an invalid character ID.');
            }
		}
		return result;
	},

    getDenomAmt = function (char_id, denom) {
        var amt = 0, char = getObj('character', char_id);
        if (char) {
            var amtField, denom = denom.toLowerCase();
            if (isShapedSheet()) {
                var denom_id = findDenomID(char_id, denom);
                amtField = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + denom_id + '_quantity' })[0];
            } else {
                amtField = findObjs({ type: 'attribute', characterid: char_id, name: denom }, {caseInsensitive: true})[0];
            }
            if (amtField) amt = parseInt(amtField.get('current'));
            else log(denom + ' field not found!');
        }
        return amt;
    },

    changeDenomAmt = function (char_id, denom, amt) {
        var char = getObj('character', char_id);
        if (char) {
            var amtField, denom = denom.toLowerCase();
            if (isShapedSheet()) {
                var denom_id = findDenomID(char_id, denom);
                amtField = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + denom_id + '_quantity' })[0];
            } else {
                amtField = findObjs({ type: 'attribute', characterid: char_id, name: denom })[0];
            }
            if (amtField) amtField.setWithWorker({ current: amt });
        } //if char
    },

    validateDenomination = function (char_id, denom) {
        var denom_name = denom.toUpperCase();
        // We use a quantity of 666 to avoid the 0=false conundrum when creating new attributes
        if (isShapedSheet()) {
            var currency = [
                {name: 'Copper', acronym: 'CP', value: 0.001, weight: 0.02, border: 'COPPER', weight_system: 'POUNDS', quantity: '666'},
                {name: 'Silver', acronym: 'SP', value: 0.01, weight: 0.02, border: 'SILVER', weight_system: 'POUNDS', quantity: '666'},
                {name: 'Electrum', acronym: 'EP', value: 0.5, weight: 0.02, border: 'ELECTRUM', weight_system: 'POUNDS', quantity: '666'},
                {name: 'Gold', acronym: 'GP', value: 1, weight: 0.02, border: 'GOLD', weight_system: 'POUNDS', quantity: '666'},
                {name: 'Platinum', acronym: 'PP', value: 10, weight: 0.02, border: 'PLATINUM', weight_system: 'POUNDS', quantity: '666'}
            ]

            var row_id = findDenomID(char_id, denom);
            if (row_id == '') {
                // Create denomination if not found
                var tmpDenom = _.find(currency, function (cur) { return cur.acronym == denom.toUpperCase(); });
                const data = {};
                row_id = generateRowID();
                var repString = 'repeating_currency_' + row_id;
                Object.keys(tmpDenom).forEach(function (field) {
                    data[repString + '_' + field] = tmpDenom[field];
                });
                setAttrs(char_id, data);
            }
            // Set name to repeating field with new ID
            denom_name = 'repeating_currency_' + row_id + '_quantity';
        }

        // Double check to make sure our quantity field exists
        var curr_field = findObjs({ type: 'attribute', characterid: char_id, name: denom_name }, {caseInsensitive: true})[0];
        if (!curr_field) curr_field = createObj("attribute", {characterid: char_id, name: denom_name, current: '666'});

        // Verify we have a quantity and zero out our 666 quantity
        var curr_amt = getAttrByName(char_id, denom_name, 'current');
        if (curr_amt == '666') curr_field.setWithWorker({ current: '0' });
    },

    findDenomID = function (char_id, denom) {
        var row_id = '', re = new RegExp('^repeating_currency_[^_]+_acronym$', 'i');
        var items = _.filter(findObjs({type: 'attribute', characterid: char_id}), function (x) { return x.get('name').match(re) !== null; });
        var row = _.find(items, function (item) { return item.get('current').toString().toLowerCase() == denom.toLowerCase(); });
        if (row) row_id = row.get('name').split('_')[2];
        return row_id;
    },

	showDialog = function (title, name, content, player, whisper=true) {
        var body, whisperTo = '', gm = /\(GM\)/i;
        if (whisper) whisperTo = '/w ' + (gm.test(player) ? 'GM ' : '"' + player + '" ');
        if (isShapedSheet()) {
            body = '&{template:5e-shaped} {{title=' + title + '}} {{content=' + content + '}}';
            if (name !== '') body += ' {{show_character_name=1}} {{character_name=' + name + '}}';
        } else {
            title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
            if (name !== '') title += '<div style=\'' + styles.subtitle + '\'>' + name + '</div>';
            body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
        }
        sendChat('PurseStrings', whisperTo + body);
	},

	adminDialog = function (title, content) {
        if (isShapedSheet()) {
            var message = '/w GM &{template:5e-shaped} {{title=' + title + '}} {{content=' + content + '}}';
            sendChat('PurseStrings', message, null, {noarchive:true});
        } else {
            title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
            var body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
            sendChat('PurseStrings','/w GM ' + body, null, {noarchive:true});
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

    addShowPurse = function (char_id) {
        var retval = false, abilities = findObjs({ name: 'ShowPurse', type: 'ability', characterid: char_id })[0];
        if (!abilities) {
            var psmacro = createObj("ability", { name: 'ShowPurse', characterid: char_id, action: '!ps --show --whisper', istokenaction: true });
            retval = true;
        }
        return retval;
    },

    addShowInventory = function (char_id) {
        var retval = false, abilities = findObjs({ name: 'ShowInventory', type: 'ability', characterid: char_id })[0];
        if (!abilities) {
            var psmacro = createObj("ability", { name: 'ShowInventory', characterid: char_id, action: '!ps --invlist @{selected|token_id}', istokenaction: true });
            retval = true;
        }
        return retval;
    },

    whispers = function (cmds) {
        // Returns whether or not "--whisper" was sent
        var result = false, regex = /\-\-whisper/i;
        if (regex.test(cmds)) result = true;
        return result;
    },

    processGMNotes = function (notes) {
        var retval, text = unescape(notes).trim();
        text = text.replace(/<p[^>]*>/gi, '<p>').replace(/\n(<p>)?/gi, '</p><p>').replace(/<br>/gi, '</p><p>').replace(/<\/?(span|div|pre|img|code|b|i)[^>]*>/gi, '');
        if (text != '' && /<p>.*?<\/p>/g.test(text)) retval = text.match(/<p>.*?<\/p>/g).map( l => l.replace(/^<p>(.*?)<\/p>$/,'$1'));
        return retval;
    },

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

    commandSheet = function (msg) {
        var sheet = msg.replace('!ps --sheet', '').trim().toLowerCase();
        if (sheet == '') state['PURSESTRINGS'].sheet = detectSheet();
        else if (sheet.includes('shaped')) state['PURSESTRINGS'].sheet = '5e Shaped';
        else state['PURSESTRINGS'].sheet = '5th Edition OGL';
        adminDialog('Sheet Set', 'Character sheet has been set to "' + state['PURSESTRINGS'].sheet + '".');
        commandConfig(msg);
    },

    detectSheet = function () {
        var sheet = '5th Edition OGL', char = findObjs({type: 'character'})[0];
        if (char) {
            var charAttrs = findObjs({type: 'attribute', characterid: char.get('id')}, {caseInsensitive: true});
            if (_.find(charAttrs, function (x) { return x.get('name') == 'character_sheet' && x.get('current').startsWith('Shaped'); })) sheet = '5e Shaped';
        }
        return sheet;
    },

    isShapedSheet = function () {
        return (typeof state['PURSESTRINGS'].sheet != 'undefined' && state['PURSESTRINGS'].sheet == '5e Shaped');
    },

    useItemDB = function () {
        return (typeof ItemDB !== 'undefined');
    },

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers,
        changePurse: changePurse,
        distributeCoins: commandDist,
        version: version
	};
}());

on("ready", function () {
    'use strict';
	PurseStrings.checkInstall();
    PurseStrings.registerEventHandlers();
});
