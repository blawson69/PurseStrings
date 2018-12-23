# PurseStrings

This [Roll20](http://roll20.net/) script handles currency and currency exchanges for characters using the [5e Shaped Sheet](http://github.com/mlenser/roll20-character-sheets/tree/master/5eShaped). It adds a "Purse" to a character for storing coinage, and will add/subtract appropriately when collecting loot, paying for goods/services, etc. This script also manages a rudimentary inventory system, allowing a dynamic merchant experience. You can set up characters/NPCs with an inventory that is updated with every purchase.

## Coinage
PurseStrings uses the [SRD monetary system](https://roll20.net/compendium/dnd5e/Treasure#content) and is fairly flexible in the way it accepts coinage. Coinage can be sent as either a list of amounts & denominations (commas and spaces between numbers and denominations are accepted), or as a shorthand list with a colon separating the amounts in denominational order from smallest to largest (cp, sp, ep, gp, pp) with zeros for placeholders.

All of the examples below represent 30cp and 4gp:
* 30cp 4gp
* 30 cp 4 gp
* 30cp, 4gp
* 30:0:0:4:0

## Party Members
You can add characters to a Party Members list which persists across sessions. This makes the distribution of loot easy, as it eliminates the need for selecting multiple tokens. This only applies to the use of the `--dist` command. Giving individual characters money still requires that the character(s) token(s) be selected.

## Merchant Setup
Merchants are characters you have set up with PurseStrings that have items or services to sell. To create an inventory, follow the instructions below.
1. Edit the character's journal entry and go to the GM Notes field.
2. The first line must be "PurseStrings Inventory" and nothing else.
3. Enter each item on its own line in the following manner:  
    *Item Name|price|quantity*  
If you wish to have an item that is "infinitely available" such as ale or services of any kind, leave the quantity blank:  
    *Item Name|price|*
4. If you have multiple categories, you may add category headers by simply giving the category name its own line.
5. Click the 'Save Changes' button.

Here is an example GM Note for a small town merchant:
```
PurseStrings Inventory
SERVICES
Sword Sharpening|2gp|
WEAPONS
Dagger|2gp|5
Hand Axe|5gp|3
Shortsword|10gp|1
ADVENTURING GEAR
Potion of Healing|50gp|4
Alchemist's Fire (flask)|50gp|2
```
If a merchant buys an item from a player that is not in their inventory, it will be added to the bottom of the list. As is standard with these things, the purchase price will be double the amount it was bought for. Updates to inventory outside of purchases must be done by editing the GM Notes field again.

**Note:** The PurseStrings inventory data *must* be the only data in the GM Notes field!

## Syntax

```!ps <parms>```

## Parameters:
* **[--setup](#--setup)**
* **[--config](#--config)**
* **[--drop](#--drop)**
* **[--stock](#--stock)**
* **[--party](#--party)**
* **[--show](#--show)**
* **[--dist](#--dist)** <_coinage_>
* **[--add](#--add)** <_coinage_>
* **[--subt](#--subt)** <_coinage_>
* **[--give](#--give)** <_giver_id_> <_receiver_id_> <_coinage_>
* **[--buy](#--buy)** <_buyer_id_> <_seller_id_> <_coinage_>
* **[--invlist](#--invlist)** <_merchant_id_>

---
### --setup
**GM Only** The GM must setup all player characters and relevant NPCs before using PurseStrings. Select each token representing the character(s) you want to setup and run the following command. This command adds the relevant PurseStrings attributes to each character, and gives players a token action for calling the `--show` command to view their Purse:

```!ps --setup```

If you wish to add a starting amount to the selected characters, you can optionally pass the coinage parameter along with the `--setup` command. Keep in mind the given amount will be added to each selected character. The following adds 50cp, 20sp, and 10gp to each character selected:

```!ps --setup 50:20:0:10:0```

---
### --config
**GM Only** One of the first things you will want to do is configure PurseStrings for your game. After you have setup all of your characters using the `--setup` command above, use the `--config` command to see a list of your Party Members and the value of your **drop** and **showStock** variables. The config menu will give a link to change these variables as well as a link to add Party Members.

```!ps --config```

See below for more information about the **[Drop](#--drop)** and **[showStock](#--stock)** variables and adding Party Members to the list.

---
### --drop
**GM Only** The GM can change the way loot is distributed (during the use of `--dist` above) using the `--drop` command. Set it to "true" if you want the leftover coinage to be dropped or "false" to give it to a random Party Member. The default value is "false." An option to change this setting is included in the `--config` dialog.

```
!ps --drop true
!ps --drop false
```

---
### --stock
**GM Only** When a merchant's inventory is displayed, you can either show the amount of items in stock, or keep this information hidden. To change this you use the `--stock` command. Set it to "true" if you wish to display the number of items in inventory, or "false" to prevent the inventory count from showing. Default is "true." This parameter applies to all merchants in the game. An option to change this setting is included in the `--config` dialog.

```
!ps --stock true
!ps --stock false
```

Out of stock items (a quantity of zero) will display "(out of stock)" when showStock is "true." If showStock is "false", the out of stock items are not displayed at all. Any items that have an "infinite availability" such as services ([see above](#merchants-setup)) will always be shown and will not display any quantity regardless of the showStock setting.

---
### --party
**GM Only** You may add characters to a Party Members list that persists between sessions. This will allow you to utilize the `--dist` command without needing player tokens selected. To do this, select the tokens representing the characters you wish to add and use the following command:

```!ps --party```

You can use this command more than once in case you are in game and cannot select all of them at once. The command will simply add the new token to the list.

If you wish to remove characters from the Party Members list, you will essentially start over with a new group. Select the tokens you wish to keep or add and pass `--reset` along with the `--party` command:

```!ps --party --reset```

Passing this command without tokens selected will *remove all characters from the list.*

---
### --show
To display the contents of a character's Purse, use the `--show` parameter. It will display Purse contents for all selected tokens, and shows the total weight of all coins for encumbrance purposes:

```!ps --show```

You may also send an optional `--whisper` command to make `--show` whisper the results.

```!ps --show --whisper```

---
### --dist
**GM Only** When the players have discovered treasure, you may use PurseStrings to distribute the coinage portion of the loot evenly among Party Members using `--dist` command. Coinage can be in any format above.

```
!ps --dist 156:280:0:666:0
!ps --dist 146sp, 398gp
```

The leftover coinage that remains when it cannot be evenly divided can either be dropped (so the players can decide amongst themselves who should receive the remainder) or given to a random Party Member. To configure this there is a `--drop` command (below) which toggles this behavior on or off. When leftover coins are dropped, the dialog will give a "Give leftovers" link to conveniently call the `--add` command for the remaining coins. Select the recipient of the leftover coins and click the link.

---
### --add
**GM Only** To add coinage to a character(s) Purse, simply pass it with the `--add` parameter. The following adds 10gp to each selected character:

```!ps --add 10gp```

---
### --subt
**GM Only** To simply remove coinage from a character(s) Purse (without giving it to another character) you use the `--subt` parameter along with the amount of coinage you wish to remove. If the amount of the coinage is more than what that character has in their Purse, the operation will fail. The following subtracts 10gp from each selected character:

```!ps --subt 10gp```

Equivalences are used when determining what coins are removed. For instance, if the Purse has 50sp and 5gp and the amount to subtract is 6gp, the Purse will contain 40sp and 0gp once the subtraction is complete. A Purse with 2cp and 7sp can subtract 5cp and the script will borrow from larger denominations to make up the remainder, in this case leaving the Purse at 7cp and 6sp.

---
### --give
Characters can exchange money between themselves. The first ID passed is that of the character giving the money, the second is that of the recipient character. Coinage is sent as the last parameter.

```!ps --give <giver_id> <receiver_id> 50gp```

As with the `--subt` parameter, the exchange will fail if the amount of the coinage is more than what the giver has in their Purse, and equivalences will be used for making change.

---
### --buy
Characters can also pay of goods & services as well. PurseStrings handles the monetary transaction along with the inventory for a character/NPC that has been set up as a Merchant ([see above](#merchants-setup)).

To exchange money for an item or service, you use the `--buy` parameter along with the character ID of both the buyer and the seller. Both IDs must be included as parameters because of the way the API handles targeted tokens. The first ID passed is that of the buyer character, the second is that of the seller. As always, the coinage is sent last.

```!ps --buy <buyer_id> <seller_id> 50gp```

As with the `--subt` parameter, the transaction will fail if the amount of the coinage is more than what the buyer has in their Purse, and equivalences will be used for making change.

If you are using `--buy` to purchase an item, you may send the optional `item|<item_description>` parameter as a way to better describe the transaction. This parameter *must come last* and will be included in the transaction dialog. The item description is optional except for when selling to a Merchant.

```!ps --buy <buyer_id> <seller_id> 50gp item|Potion of Healing```

To indicate a purchase involving a Merchant with an inventory, the `--inv` parameter must be passed along with an indicator of `+` or `-` which determines whether the item being purchased should be added or removed from the Merchant's inventory. For example, the command to purchase a Dagger from a Merchant is as follows:

```!ps --buy <buyer_id> <merchant_id> 50gp --inv- item|Dagger```

However, if a player has found a Greatsword and wishes to sell it to the Merchant, you would use this command:

```!ps --buy <merchant_id> <seller_id> 37gp --inv+ item|Greatsword```

The Inventory dialog for Merchants (below) outputs the proper code for all purchases from a Merchant. Players will simply click the "Buy" link in the Inventory dialog to make a purchase. Once the inventory has been updated, a new inventory list dialog will automatically be generated.

---
### --invlist
**GM Only** Merchants that have already been setup with an inventory list (see [instructions](#merchants-setup) above) may display their inventory using the `--invlist` command followed by the character ID:

```!ps --invlist <merchant_id>```

This generates a dialog with the merchant's inventory and provides the item name, price, and a link the player's can use to make the purchase.

## Notes

PurseStrings was developed on Shaped Sheet version 19.1.3 but should work with many previous versions as well. Be aware the script **does not interact** with the coinage visible in the 5e Shaped character sheet. In fact, the lack of access to those values is the sole purpose of this script. As such, any amounts entered in those fields will be ignored.
