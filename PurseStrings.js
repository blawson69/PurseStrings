/*
PurseStrings

USE
Handles currency and currency exchanges for characters using the 5e Shaped Sheet and utilizing the
SRD version of currency. It adds fields to each character which act as a "purse" for storing the
requisite cp, sp, gp, ep, and pp, and will add/substract from them appropriately when collecting 
loot, paying for goods/services, etc.

COMMANDS
-------------------------
!ps --help - Shows help menu
!ps --setup - GM only. Adds necessary PurseString fields to the selected character(s) and optionally sets
	default values for each. See the --add command below for details.
!ps --show - Shows the current Purse amounts and a total equivalent in gp.

The commands --add, --subt, and --buy all require a token to be selected that represents a character. This
character must have been setup using the --setup command prior to utilizing any of these commands.
They all require the currency to be supplied in order of least to greatest as the last set of parameters. 
Values for which there are no coins should get a zero(0) amount.
Examples:
	!ps --add 0:0:100:0:0			<-- Adds 100 gp to the selected character's Purse
	!ps --add 200:30:10:0:0			<-- Adds 200 cp, 30 sp, and 10 gp to the selected character's Purse
	!ps --subt 0:0:0:0:150			<-- Subtracts 15 pp from the selected character's Purse

The --buy command requires a seller ID who will be receiving the payment. This character must also have been
setup using the --setup command. The buyer (selected character) must have enough equivalent currency to
make the purchase or the transaction will fail and a message sent.
Example:
	!ps --buy @{target|character_id} 10:0:0:0		<-- Pays the target character 10 cp

TODO:
Deploy a currency converter of some sort...? Maybe?
*/

var PurseStrings = PurseStrings || (function () {
    'use strict';
    
    //---- INFO ----//
    
    var script = { name: 'PurseStrings', version: '0.1.0'},
        devMode = false,
        languages = {},
    
    //---- PRIVATE FUNCTIONS ----//
    
    startup = function () {
        if (!state.PurseStrings || devMode) {
            resetState();
        }
        log('--> ' + script.name + ' (v' + script.version + '): Initiated <--');
    },
	
    resetState = function () {
        state.PurseStrings = {
            moneyNames = {cp:'cp',sp:'sp',ep:'ep',gp:'gp',pp:'pp'},
            moneyValues = {cp:'0.01',sp:'0.1',ep:'0.5',gp:'1',pp:'10'},
			attributes = {cp:'pursestrings_cp',sp:'pursestrings_sp',ep:'pursestrings_ep',gp:'pursestrings_gp',pp:'pursestrings_pp'},
            version: script.version
        };
        log('--> ' + script.name + ' (v' + script.version + ') created new state storage <--');
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
                    if (playerIsGM(msg.playerid)) {
                        if (command[2] == '--setup') {
							sendChat('PurseStrings', '/w ' + msg.who + ' You called the --setup command using "' + command[3] + '"', null, {noarchive:true});
                            //commandSetup(msg, command);
                        } else {
                            sendChat('PurseStrings', '/w ' + msg.who + ' Invalid command!', null, {noarchive:true});
                        }
                    } else {
                        if (command[2] == '--add' && command[3]) {
							sendChat('PurseStrings', '/w ' + msg.who + ' You called the --add command using "' + command[3] + '"', null, {noarchive:true});
							//commandChange(msg, command, 'add');
                        } else if (command[2] == '--subt' && command[3]) {
							sendChat('PurseStrings', '/w ' + msg.who + ' You called the --subt command using "' + command[3] + '"', null, {noarchive:true});
							//commandChange(msg, command, 'subt');
                        } else if (command[2] == '--show' && command[3]) {
							sendChat('PurseStrings', '/w ' + msg.who + ' You called the --show command using "' + command[3] + '"', null, {noarchive:true});
							//commandShow(msg, command);
                        } else if (command[2] == '--buy' && command[3]) {
							sendChat('PurseStrings', '/w ' + msg.who + ' You called the --buy command using "' + command[3] + '"', null, {noarchive:true});
							//commandBuy(msg, command);
						} else {
							sendChat('PurseStrings', '/w ' + msg.who + ' Only the GM can access PurseStrings configuration commands!', null, {noarchive:true});
						}
                    }
                } else {
                    sendChat('PurseStrings', '/w ' + msg.who + ' Do you want help? Use !ps --help', null, {noarchive:true});
                }
            } else {
                sendChat('PurseStrings', '/w ' + msg.who + ' Do you want help? Use !ps --help', null, {noarchive:true});
            }
        } else {
			sendChat('PurseStrings', '/w ' + msg.who + ' Do you want help? Use !ps --help', null, {noarchive:true});
		}
    },
	
    commandSetup = function (msg, coinage) {
		// Configure character sheet for each selected character
		if (!msg.selected || !msg.selected.length) {
			sendChat('PurseStrings', '/w ' + msg.who + ' No tokens are selected!', null, {noarchive:true});
			return;
		}
		let tokens = msg.selected.map(s => getObj(s._type, s._id));
		
		tokens.forEach(token => {
			if (token.get('represents') !=== '') {
				let char_id = token.get('represents');
				let character = getObj('character', token.get('represents'));
				attributes.forEach(function (attribute) {
					let curAttr = findObjs({
						_type: 'attribute', 
						_id: char_id,
						name: attribute
					}, {caseInsensitive: true})[0];
					if (!curAttr) {
						sendChat('PurseStrings', '/w ' + msg.who + ' The attribute "' + attribute + '" has been added to ' + character.get('name') + '.', null, {noarchive:true});
						curAttr = createObj('attribute', {
							_id: char_id,
							name: attribute_name,
							current: '0'
						});
					} else {
						sendChat('PurseStrings', '/w ' + msg.who + ' The attribute "' + attribute + '" already exists for ' + character.get('name') + '.', null, {noarchive:true});
					}
				});
			} else {
				sendChat('PurseStrings', '/w ' + msg.who + ' This token is not a character: ' + token.get('id'), null, {noarchive:true});
			}
		});		
	},
	
	commandChange = function (msg, coinage, action='add') {
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w ' + msg.who + ' No tokens are selected!', null, {noarchive:true});
			return;
		}
		let tokens = msg.selected.map(s => getObj(s._type, s._id));
		
		tokens.forEach(token => {
		});		
	},
	
	commandShow = function (msg, coinage) {
		// Show one or more individual's current Purse contents
		if(!msg.selected || !msg.selected.length){
			sendChat('PurseStrings', '/w ' + msg.who + ' No tokens are selected!', null, {noarchive:true});
			return;
		}
		let tokens = msg.selected.map(s => getObj(s._type, s._id));
		
		tokens.forEach(token => {
		});
	},
	
	parseCoins = (msg, cmd='') => {
		// Parses the input for the coin string and returns it as an array or null if error
		var coins = null, tmpcoins = [],
		regex = /[:]+/i,
		commands = msg.content.split(/\s+/);
		
		commands.forEach(function (cmd) {
			if (regex.test(cmd)) {
				var msgcoins = cmd.split(':');
				tmpcoins['cp'] = msgcoins[0] && !isNaN(msgcoins[0]) ? msgcoins[0] : 0;
				tmpcoins['sp'] = msgcoins[1] && !isNaN(msgcoins[1]) ? msgcoins[1] : 0;
				tmpcoins['ep'] = msgcoins[2] && !isNaN(msgcoins[2]) ? msgcoins[2] : 0;
				tmpcoins['gp'] = msgcoins[3] && !isNaN(msgcoins[3]) ? msgcoins[3] : 0;
				tmpcoins['pp'] = msgcoins[4] && !isNaN(msgcoins[4]) ? msgcoins[4] : 0;
				coins = tmpcoins;
				break;
			}
		}
		
		return coins;
    },
	    
    //---- PUBLIC FUNCTIONS ----//
    
    registerEventHandlers = function () {
		on('chat:message', handleInput);
	},
    
    checkInstall = function () {
        log('> ' + script.name + ' (v' + script.version + ') is installed and running <');
        startup();
    };
    
    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers
	};
}());

on("ready", function () {
    PurseStrings.checkInstall();
    PurseStrings.registerEventHandlers();
});