# PurseStrings

This [Roll20](http://roll20.net/) script handles currency and currency exchanges for characters using the [5e Shaped Sheet](http://github.com/mlenser/roll20-character-sheets/tree/master/5eShaped). It adds a "Purse" to a character for storing coinage, and will add/subtract appropriately when collecting loot, paying for goods/services, etc. (See the [Notes](#notes) below for more info.)

PurseStrings now also manages a rudimentary inventory system, allowing a dynamic merchant experience. You can set up characters/NPCs with an inventory that is updated with every purchase.

### Coinage
Coinage can be sent as either a list of amounts & denominations (commas and spaces between numbers and denominations are accepted), or as a shorthand list with a colon separating the amounts in denominational order from smallest to largest with zeros for placeholders.

All of the examples below represent 30cp and 4gp:
* 30cp 4gp
* 30 cp 4 gp
* 30cp, 4gp
* 30:0:0:4:0

### Party Members
You can add characters to a Party Members list which persists across sessions. This makes the distribution of loot easy, as it eliminates the need for selecting multiple tokens. This only applies to the use of the `--dist` command. Giving individual characters money still requires that the character(s) token(s) be selected.

### Merchants Setup
Merchants are characters you have set up with PurseStrings that have items to sell. To create an inventory of items, follow the instructions below.
1. Edit the character's journal entry and go to the GM Notes field.
2. The first line must be 'PurseStrings Inventory' and nothing else.
3. Enter each item on its own line in the following manner:  
    Item Name|price|quantity  
If you wish to have an item that is "infinitely available" such as ale or services of any kind, leave the quantity blank:  
    Item Name|price|
4. If you have multiple categories, you may add category headers by simply giving the category name its own line.
5. Click the 'Save Changes' button.
Here is an example GM Note for a small time merchant:
```
PurseStrings Inventory
WEAPONS
Dagger|2gp|5
Hand Axe|5gp|3
Shortsword|10gp|1
ADVENTURING GEAR
Potion of Healing|50gp|4
Alchemist's Fire (flask)|50gp|2
SERVICES
Sword Sharpening|2gp|
```
If the merchant buys an item from a player that is not in their inventory, it will be added to the bottom of the list. As is standard with these things, the purchase price will be double the amount it was bought for. Updates to inventory outside of purchases must be done by editing the GM Notes field again.

**Note:** The PurseStrings inventory data *must* be the only data in the GM Notes field!

### Syntax

```!ps <parms>```

### Parameters:
* **--setup**
* **--config**
* **--party**
* **--show**
* **--add** <_coinage_>
* **--dist** <_coinage_>
* **--drop**
* **--subt** <_coinage_>
* **--buy** <_buyer_id_> <_seller_id_> <_coinage_>
* **--invlist** <_merchant_id_>

---
**GM Only** The GM must setup all player characters and relevant NPCs before using PurseStrings. Select each token representing the character(s) you want to setup and run the following command. This command adds the relevant PurseStrings attributes to each character, and gives players a token action for calling the `--show` command to view their Purse:

```!ps --setup```

If you wish to add a starting amount to the selected characters, you can optionally pass the coinage parameter along with the `--setup` command. Keep in mind the given amount will be added to each selected character. The following adds 50cp, 20sp, and 10gp to each character selected:

```!ps --setup 50:20:0:10:0```

---
**GM Only** One of the first things you will want to do is configure PurseStrings for your game. After you have setup all of your characters using the `--setup` command above, use the `--config` command to see a list of your Party Members and the value of your **drop** variable. The config menu will give a link to change your drop variable as well as a link to add Party Members.

```!ps --config```

See below for more information about the **drop** variable and adding Party Members to the list.

---
**GM Only** You may add characters to a Party Members list that persists between sessions. This will allow you to utilize the `--dist` command without needing player tokens selected. To do this, select the tokens representing the characters you wish to add and use the following command:

```!ps --party```

You can use this command more than once in case you are in game and cannot select all of them at once. The command will simply add the new token to the list.

If you wish to remove characters from the Party Members list, you will essentially start over with a new group. Select the tokens you wish to keep or add and pass `--reset` along with the `--party` command:

```!ps --party --reset```

Passing this command without tokens selected will *remove all characters from the list.*

---
To display the contents of a character's Purse, use the `--show` parameter. It will display Purse contents for all selected tokens, and shows the total weight of all coins for encumbrance purposes:

```!ps --show```

You may also send an optional `--whisper` command to make --show whisper the results.

---
**GM Only** To add coinage to a character(s) Purse, simply pass it with the `--add` parameter. The following adds 10gp to each selected character:

```!ps --add 10gp```

---
**GM Only** When the players have discovered treasure, you may use PurseStrings to distribute the coinage portion of the loot evenly among Party Members using `--dist` command. Coinage can be in any format above.

```!ps --dist 156:280:0:666:0```
```!ps --dist 146sp, 398gp```

The leftover coinage that remains when it cannot be evenly divided can either be dropped (so the players can decide amongst themselves who should receive the remainder) or given to a randomly selected member of the group. To configure this there is a `--drop` command (below) which toggles this behavior on or off. When leftover coins are dropped, the dialog will give a "Give leftovers" link to conveniently call the `--add` command for the remaining coins. Select the recipient of the leftover coins and click the link.

---
**GM Only** The GM can change the way loot is distributed (via the `--dist` command above) using the `--drop` command. Set it to "true" if you want the leftover coinage to be dropped or "false" to give it to a random party member. The default value is "false." If false, the recipient of the leftover loot will be chosen from one of the Party Members.

```!ps --drop true```
```!ps --drop false```

---

**GM Only** To simply remove coinage from a character(s) Purse (without giving it to another character) you use the `--subt` parameter along with the amount of coinage you wish to remove. If the amount of the coinage is more than what that character has in their Purse, the operation will fail. The following subtracts 10gp from each selected character:

```!ps --subt 10gp```

Equivalences are used when determining what coins are removed. For instance, if the Purse has 50sp and 5gp and the amount to subtract is 6gp, the Purse will contain 40sp and 0gp once the subtraction is complete. A Purse with 2cp and 7sp can subtract 5cp and the script will borrow from larger denominations to make up the remainder, in this case leaving the Purse at 7cp and 6sp.

---
Characters can also exchange money. This can be either the purchase of goods & services from a NPC or simply giving money to another player. PurseStrings handles the monetary transaction as well as the inventory for a character/NPC that has been set up as a Merchant ([see above](#merchants-setup)).

To exchange money, you use the `--buy` parameter along with the character ID of both the buyer and the seller. Both IDs must be included as parameters because of the way the API handles targeted tokens. The first ID passed is that of the buyer character, the second is that of the seller. As always, the coinage is sent last.

```!ps --buy @{selected|character_id} @{target|character_id} 50gp```

As with the `--subt` parameter, the transaction will fail if the amount of the coinage is more than what the buyer has in their Purse, and equivalences will be used for making change.

If you are using `--buy` to purchase an item, you may send the optional `item|<_item_description_>` parameter as a way to better describe the transaction. This parameter *must come last* and will be included in the transaction dialog.

```!ps --buy @{selected|character_id} @{target|character_id} 50gp item|Potion of Healing```

The Inventory dialog for merchants (see below) outputs the proper code for all purchases. Players will just need to click the "Buy" link in the Inventory dialog to make a purchase.

---
**GM Only** Merchants that have already been setup with an inventory list (see [instructions](#merchants-setup) above) may display their inventory using the `--invlist` command followed by the character ID:

```!ps --invlist @{selected|character_id}```

This generates a dialog with the merchant's inventory and provides the item name, price, and a link the player's can use to make the purchase.

### Notes

PurseStrings was developed on Shaped Sheet version 19.1.3 but should work with many previous versions as well. It also assumes the use of the [SRD monetary system](https://roll20.net/compendium/dnd5e/Treasure#content). Be aware the script does not interact with the coinage visible in the 5e Shaped character sheet. In fact, the lack of access to those values is the sole purpose of this script. As such, any amounts entered in those fields will be ignored.
