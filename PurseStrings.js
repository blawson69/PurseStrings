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

    var version = '5.3',
    debugMode = false,
    styles = {
        box:  'background-color: #fff; border: 1px solid #000; padding: 8px 10px; border-radius: 6px; margin-left: -40px; margin-right: 0px;',
        title: 'padding: 0 0 10px 0; color: ##591209; font-size: 1.5em; font-weight: bold; font-variant: small-caps; font-family: "Times New Roman",Times,serif;',
        subtitle: 'margin-top: -4px; padding-bottom: 4px; color: #666; font-size: 1.25em; font-variant: small-caps;',
        list:  'list-style-type: circle; margin-left: 4px; list-style-position: inside;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 6px 9px; color: #fff; text-align: center;',
        buttonWrapper: 'text-align: center; margin: 14px 0 10px 0; clear: both;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #8e342a; text-decoration: underline;',
        bigger: 'font-size: 1.125em; font-weight: bold; margin-right: 3px;',
        unavail: 'color: #636363; font-style: italic;', right: 'float: right;',
        alert: 'color: #C91010; font-size: 1.25em; font-weight: bold; text-align: center;',
        code: 'font-family: "Courier New", Courier, monospace; font-size: 1.25em; padding-bottom: 6px;'
    },

    checkInstall = function () {
        if (!_.has(state, 'PURSESTRINGS')) state['PURSESTRINGS'] = state['PURSESTRINGS'] || {};
        if (typeof state['PURSESTRINGS'].pursed == 'undefined') state['PURSESTRINGS'].pursed = [];
        if (typeof state['PURSESTRINGS'].partyMembers == 'undefined') state['PURSESTRINGS'].partyMembers = [];
        if (typeof state['PURSESTRINGS'].showStock == 'undefined') state['PURSESTRINGS'].showStock = true;

        if (typeof state['PURSESTRINGS'].sheet == 'undefined') {
            var message, sheet = detectSheet();
            if (sheet == 'Unknown') {
                message = 'PurseStrings was unable to detect the character sheet for your game! You must be using either the 5e Shaped Sheet or the 5th Edition OGL Sheet. Please indicate which sheet you are using.';
                message += '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --sheet ?{Choose Sheet|5e Shaped|5th Edition OGL}">SET SHEET</a></div>';
                adminDialog('Configuration Notice', message);
            } else {
                state['PURSESTRINGS'].sheet = sheet;
            }
        }
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
                    case '--pursed':
  						if (playerIsGM(msg.playerid)) {
  							commandPursed();
  						}
  						break;
                    case '--remove':
  						if (playerIsGM(msg.playerid)) {
  							unPurse(parms[2]);
  						}
  						break;
                    case '--invlist':
  						if (playerIsGM(msg.playerid)) {
  							commandInventory(msg.content);
  						}
  						break;
                    case '--sheet':
  						if (playerIsGM(msg.playerid)) {
  							commandSheet(msg.content);
  						}
  						break;
                    case '--update-merchant':
  						if (playerIsGM(msg.playerid)) {
  							commandUpdateMerch(msg.selected);
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
                    var pursed = isPursed(char_id);
                    var can_purse = canPurse(char_id);

                    if (!pursed && (can_purse || state['PURSESTRINGS'].sheet == '5th Edition OGL')) {
                        var newChar = {char_id: char_id, char_name: character.get('name')};
                        var charAttrs = findObjs({type: 'attribute', characterid: char_id}, {caseInsensitive: true});

                        if (state['PURSESTRINGS'].sheet == '5e Shaped') {
                            var currencyAttrs = _.filter(charAttrs, function (attr) {
                                return (attr.get('name').match(/^repeating_currency_.+_acronym$/) !== null);
                            });
                            _.each(currencyAttrs, function (attr) {
                                var acronym = attr.get('current'), aID = attr.get('name').split('_')[2];
                                if (acronym == 'CP') newChar.cp_id = aID;
                                if (acronym == 'SP') newChar.sp_id = aID;
                                if (acronym == 'EP') newChar.ep_id = aID;
                                if (acronym == 'GP') newChar.gp_id = aID;
                                if (acronym == 'PP') newChar.pp_id = aID;
                            });

                            var cp = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + newChar.cp_id + '_quantity' })[0];
                            if (!cp) cp = createObj("attribute", {characterid: char_id, name: 'repeating_currency_' + newChar.cp_id + '_quantity', current: 0});
                            var sp = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + newChar.sp_id + '_quantity' })[0];
                            if (!sp) sp = createObj("attribute", {characterid: char_id, name: 'repeating_currency_' + newChar.sp_id + '_quantity', current: 0});
                            var ep = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + newChar.ep_id + '_quantity' })[0];
                            if (!ep) ep = createObj("attribute", {characterid: char_id, name: 'repeating_currency_' + newChar.ep_id + '_quantity', current: 0});
                            var gp = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + newChar.gp_id + '_quantity' })[0];
                            if (!gp) gp = createObj("attribute", {characterid: char_id, name: 'repeating_currency_' + newChar.gp_id + '_quantity', current: 0});
                            var pp = findObjs({ type: 'attribute', characterid: char_id, name: 'repeating_currency_' + newChar.pp_id + '_quantity' })[0];
                            if (!pp) pp = createObj("attribute", {characterid: char_id, name: 'repeating_currency_' + newChar.pp_id + '_quantity', current: 0});
                        } else {
                            newChar.cp_id = 'cp';
                            newChar.sp_id = 'sp';
                            newChar.ep_id = 'ep';
                            newChar.gp_id = 'gp';
                            newChar.pp_id = 'pp';

                            var cp = findObjs({ type: 'attribute', characterid: char_id, name: 'cp' })[0];
                            if (!cp) cp = createObj("attribute", {characterid: char_id, name: 'cp', current: 0});
                            var sp = findObjs({ type: 'attribute', characterid: char_id, name: 'sp' })[0];
                            if (!sp) sp = createObj("attribute", {characterid: char_id, name: 'sp', current: 0});
                            var ep = findObjs({ type: 'attribute', characterid: char_id, name: 'ep' })[0];
                            if (!ep) ep = createObj("attribute", {characterid: char_id, name: 'ep', current: 0});
                            var gp = findObjs({ type: 'attribute', characterid: char_id, name: 'gp' })[0];
                            if (!gp) gp = createObj("attribute", {characterid: char_id, name: 'gp', current: 0});
                            var pp = findObjs({ type: 'attribute', characterid: char_id, name: 'pp' })[0];
                            if (!pp) pp = createObj("attribute", {characterid: char_id, name: 'pp', current: 0});
                        }
                        state['PURSESTRINGS'].pursed.push(newChar);
                        addShowPurse(char_id);

                        var message = '<b>Success!</b><br>PurseStrings setup is complete for ' + character.get('name') + '.';
						var coins = parseCoins(msg.content);
						if (coins) {
							var initpurse = changePurse(msg.content, char_id, 'add');
                            if (initpurse) {
                                message += ' Also, ' + prettyCoins(coins, true) + ' have been added to their Purse.';
                            }
						}

                        adminDialog('Setup Complete', message);
					} else {
                        if (pursed) adminDialog('Setup Warning', character.get('name') + ' has already been set up for PurseStrings!');
                        if (!can_purse) adminDialog('Setup Warning', character.get('name') + ' does not have the default SRD currency (CP, SP, EP, GP, and PP) on their character sheet!');
                    }
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
                if (token) {
                    if (token.get('represents') !== '' && isPursed(token.get('represents'))) {
                        var char_id = token.get('represents');
                        var character = getObj('character', char_id);
                        if (!_.find(state['PURSESTRINGS'].partyMembers, function(id) {return id == char_id;})) {
                            state['PURSESTRINGS'].partyMembers.push(char_id);
                            members.push('<li>' + character.get('name') + '</li>');
                        }
                    } else {
                        if (token.get('represents') !== '') {
                            var char_id = token.get('represents');
                            var character = getObj('character', char_id);
                            errlist.push('<li>' + character.get('name') + ' is not set up with PurseStrings.</li>');
                        } else {
                            errlist.push('<li>Token ' + token.get('id') + ' does not represent a character.</li>');
                        }
                    }
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

    commandSheet = function (msg) {
        // Set the sheet type
        var args = msg.split('--sheet');
        var sheet = (args[1]) ? args[1].trim() : '';

        if (sheet == '5e Shaped' || sheet == '5th Edition OGL') {
            state['PURSESTRINGS'].sheet = sheet;
        } else {
            state['PURSESTRINGS'].sheet = 'Unknown';
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

    commandPursed = function () {
        // Displays a list of character names who have been set up with PurseStrings
        var message = 'The following characters have been set up with PurseStrings.<br><br>You may remove one by clicking the ❌ next to their name. This will also delete them from the Party Members list but <b>will not</b> remove any currency from their character sheet.<ul>';
        _.each(state['PURSESTRINGS'].pursed, function (char) {
            message += '<li>' + char.char_name + '&nbsp;<a style=\'' + styles.textButton + ' text-decoration: none; font-weight: bold;\' href="!ps --remove ' + char.char_id + '">❌</a></li>';
        });
        message += '</ul><div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --config">&#9668; BACK</a></div>';
        adminDialog('Character List', message);
    },

    commandConfig = function (msg) {
        // Config dialog with links to make changes
        var message = '';
        if (typeof state['PURSESTRINGS'].sheet == 'undefined' || state['PURSESTRINGS'].sheet == 'Unknown') {
            message += '<p style=\'' + styles.alert + '\'>⚠️ Unknown character sheet!</p>';
            message += '<p>PurseStrings was unable to detect the character sheet for your game. You must be using either the 5e Shaped Sheet or the 5th Edition OGL Sheet. Please tell PurseStrings what character sheet is in use before you can continue using the script.</p><br>';
            message += 'See the <a style=\'' + styles.textButton + '\' href="https://github.com/blawson69/PurseStrings" target="_blank">documentation</a> for more details.'
            + '<div style=\'' + styles.buttonWrapper + '\'><a style=\'' + styles.button + '\' href="!ps --sheet ?{Choose Sheet|5e Shaped|5th Edition OGL}">SET SHEET</a></div>';
            adminDialog('Error', message);
        } else {
            message += 'You currently have ' + _.size(state['PURSESTRINGS'].pursed) + ' characters set up for use with PurseStrings. <a style=\'' + styles.textButton + '\' href="!ps --pursed">Show list</a>.';

            message += '<br><br><div style=\'' + styles.title + '\'>Default Settings</div>';
            message += '<span style=\'' + styles.bigger + '\'>Merchant stock:</span> Default is currently set to be ';
            if (state['PURSESTRINGS'].showStock) {
                message += 'shown to players, with "out of stock" items being labeled as such. <a style=\'' + styles.textButton + '\' href="!ps --stock false">Change</a>';
            } else {
                message += 'hidden from players, with "out of stock" items not being displayed in the list. <a style=\'' + styles.textButton + '\' href="!ps --stock true">Change</a>';
            }

            message += '<br><br><div style=\'' + styles.title + '\'>Party Members</div>';
            if (_.size(state['PURSESTRINGS'].partyMembers) > 0) {
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
            adminDialog('PurseStrings Config', message);
        }

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

					// Count coins to determine total weight
					var dispWeight, weight, total = purse['cp'] + purse['sp'] + purse['ep'] + purse['gp'] + purse['pp'];
                    weight = total * 0.02;
                    dispWeight = (weight <= 10) ? weight.toFixed(1) + '' : weight.toFixed(0);
					content += '<br>Total weight of coins: ' + dispWeight + ' lbs.';

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
            var take = splitTake(loot, numParty);
            _.each(partyMembers, function (id) {
                var member = getObj('character', id);
                if (member) {
                    var changed = changePurse(_.values(take).join(':'), id, 'add');
                    if (changed) {
                        recipients.push(member.get('name'));
                    } else {
                        adminDialog('Distribution Error', 'Could not give loot to ' + member.get('name') + '.');
                    }
                } else {
                    adminDialog('Distribution Error', '"' + id + '" is an invalid ID.');
                }
            });

			showDialog('Loot Distributed', '', prettyCoins(loot, true) + ' have been successfully distributed between the following Party Members:<br><ul><li>' + recipients.join('</li><li>') + '</li></ul>Each Member has received ' + prettyCoins(take, true) + '.', '', false);
		} else {
            if (numParty == 0) {
                adminDialog('Distribution Error', 'There are no Party Members to whom you can distribute loot!');
            } else {
                adminDialog('Distribution Error', 'No coinage was indicated or coinage syntax was incorrect!');
            }
		}
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
                if (merchant && isPursed(merchant.get('id'))) {
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
		var coins = null, tmpcoins = {cp:0,sp:0,ep:0,gp:0,pp:0},
		regex = /[:]+/i,
		cmdString = cmds.toString().toLowerCase().replace(/,/g, "").replace(/\s+([cp|sp|ep|gp|pp])/gi, '$1').split(/\s+/);
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

    isPursed = function (char_id) {
        // Returns whether or not the character has been "pursed"
        //(character and currency IDs added to state storage)
        var result = false;
        if ( _.find(state['PURSESTRINGS'].pursed, function(char) { return char.char_id == char_id; }) ) result = true;
        return result;
    },

	getPurse = function (char_id) {
		// Returns an array holding the given character's Purse currency
		var purse = [],
        char = _.find(state['PURSESTRINGS'].pursed, function(x) { return x.char_id == char_id; });
		if (char) {
			purse['cp'] = parseInt(getAttrByName(char_id, (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.cp_id + '_quantity' : 'cp'))) || 0;
			purse['sp'] = parseInt(getAttrByName(char_id, (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.sp_id + '_quantity' : 'sp'))) || 0;
			purse['ep'] = parseInt(getAttrByName(char_id, (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.ep_id + '_quantity' : 'ep'))) || 0;
			purse['gp'] = parseInt(getAttrByName(char_id, (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.gp_id + '_quantity' : 'gp'))) || 0;
			purse['pp'] = parseInt(getAttrByName(char_id, (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.pp_id + '_quantity' : 'pp'))) || 0;
		} else {
			purse = null;
		}

		return purse;
	},

	changePurse = function (pockets, char_id, type='add') {
		// Add or subtract from a character's Purse
        // Returns boolean result
		var result = true;
		if (isPursed(char_id)) {
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

                var char = _.find(state['PURSESTRINGS'].pursed, function(x) { return x.char_id == char_id; });
				var cp = findObjs({ type: 'attribute', characterid: char_id, name: (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.cp_id + '_quantity' : 'cp') })[0];
				var sp = findObjs({ type: 'attribute', characterid: char_id, name: (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.sp_id + '_quantity' : 'sp') })[0];
				var ep = findObjs({ type: 'attribute', characterid: char_id, name: (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.ep_id + '_quantity' : 'ep') })[0];
				var gp = findObjs({ type: 'attribute', characterid: char_id, name: (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.gp_id + '_quantity' : 'gp') })[0];
				var pp = findObjs({ type: 'attribute', characterid: char_id, name: (state['PURSESTRINGS'].sheet == '5e Shaped' ? 'repeating_currency_' + char.pp_id + '_quantity' : 'pp') })[0];

				cp.setWithWorker({ current: purse['cp'] });
				sp.setWithWorker({ current: purse['sp'] });
				ep.setWithWorker({ current: purse['ep'] });
				gp.setWithWorker({ current: purse['gp'] });
				pp.setWithWorker({ current: purse['pp'] });
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

	showDialog = function (title, name, content, player, whisper=true) {
        var body, whisperTo = '', gm = /\(GM\)/i;
        if (whisper) whisperTo = '/w ' + (gm.test(player) ? 'GM ' : '"' + player + '" ');
        if (state['PURSESTRINGS'].sheet == '5e Shaped') {
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
        if (state['PURSESTRINGS'].sheet == '5e Shaped') {
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
        if (coins['pp'] > 0 || !dropZero) tmpres.push(coins['pp'] + 'pp');
        if (coins['gp'] > 0 || !dropZero) tmpres.push(coins['gp'] + 'gp');
        if (coins['ep'] > 0 || !dropZero) tmpres.push(coins['ep'] + 'ep');
        if (coins['sp'] > 0 || !dropZero) tmpres.push(coins['sp'] + 'sp');
        if (coins['cp'] > 0 || !dropZero) tmpres.push(coins['cp'] + 'cp');
		if (tmpres.length > 1) tmpres[tmpres.length-1] = 'and ' + tmpres[tmpres.length-1];
		if (tmpres.length > 2) joiner = ', '
		result = tmpres.join(joiner);
		return result;
	},

    addShowPurse = function (char_id) {
        // Adds an ability to the character during setup for the --show command
        var abilities = findObjs({ name: 'ShowPurse', type: 'ability', characterid: char_id })[0];
        if (!abilities) {
            var psmacro = createObj("ability", { name: 'ShowPurse', characterid: char_id, action: '!ps --show --whisper', istokenaction: true });
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

    canPurse = function (char_id) {
        // Check for presence of default SRD currency attributes on 5e Shaped Sheet
        var result = true,
        charAttrs = findObjs({type: 'attribute', characterid: char_id}, {caseInsensitive: true});
        var currencyAttrs = _.filter(charAttrs, function (attr) {
            return (attr.get('name').match(/^repeating_currency_.+_acronym$/) !== null);
        });
        if (_.size(currencyAttrs) !== 5) {
            result = false;
        } else {
            _.each(currencyAttrs, function (attr) {
                var acronym = attr.get('current');
                if (acronym.match(/^(CP|SP|EP|GP|PP)$/i) === null) result = false;
            });
        }
        return result;
    },

    unPurse = function (char_id) {
        var char_name = '[character not found]';
        var pursed = _.find(state['PURSESTRINGS'].pursed, function (char) {return char.char_id == char_id});
        if (pursed) char_name = pursed.char_name;
        state['PURSESTRINGS'].pursed = _.reject(state['PURSESTRINGS'].pursed, function (char) {return char.char_id == char_id});
        state['PURSESTRINGS'].partyMembers = _.reject(state['PURSESTRINGS'].partyMembers, function(id) {return id == char_id;});
        var character = getObj('character', char_id);
        if (character) {
            var ability = findObjs({name: 'ShowPurse', type: 'ability', characterid: char_id})[0];
            if (ability) ability.remove();
        }
        adminDialog('Character Removed', char_name + ' has been removed from PurseStrings.');
        commandPursed();
    },

    detectSheet = function () {
        var sheet = 'Unknown', char = findObjs({type: 'character'})[0];
        if (char) {
            var charAttrs = findObjs({type: 'attribute', characterid: char.get('id')}, {caseInsensitive: true});
            if (_.find(charAttrs, function (x) { return x.get('name') == 'character_sheet' && x.get('current').search('Shaped') != -1; })) sheet = '5e Shaped';
            if (_.find(charAttrs, function (x) { return x.get('name').search('mancer') != -1; })) sheet = '5th Edition OGL';
        }
        return sheet;
    },

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers,
        changePurse: changePurse,
        version: version
	};
}());

on("ready", function () {
    'use strict';
	PurseStrings.checkInstall();
    PurseStrings.registerEventHandlers();
});
