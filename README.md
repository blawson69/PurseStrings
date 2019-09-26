# PurseStrings
> Now supporting the 5th Edition OGL Sheet as well as the [5e Shaped Sheet](http://github.com/mlenser/roll20-character-sheets/tree/master/5eShaped)!

This [Roll20](http://roll20.net/) script handles currency and currency exchanges for characters in games using the default [SRD monetary system](https://roll20.net/compendium/dnd5e/Treasure#content). It manages a character's currency and will add/subtract appropriately when collecting loot, paying for goods/services, etc. This script also includes an Inventory system, allowing a dynamic Merchant experience. You can create any number of Merchant NPCs with an Inventory that is updated with every purchase.

**Note:** Version 5.3 now evenly calculates the division of loot when distributing to Party Members. As this has eliminated leftover loot and the need for the `--drop` configuration setting, it has been removed from documentation and the in-game configuration dialog.

## Coinage
PurseStrings is fairly flexible in the way it accepts coinage through the various commands. It can be sent as either a list of amounts & denominations (commas and spaces between numbers and denominations are accepted), or as a shorthand list with a colon separating the amounts in denominational order from smallest to largest (cp, sp, ep, gp, pp) with zeros for placeholders.

All of the examples below represent 30cp and 4gp:
- 30cp 4gp
- 30 cp 4 gp
- 30cp, 4gp
- 30:0:0:4:0

## Party Members
You can [add characters](#--party) to a Party Members list which persists across sessions. This makes the distribution of loot easy, as it eliminates the need for selecting multiple tokens. This only applies to the use of the `--dist` command [below](#--dist). Giving individual characters money still requires that the character(s) token(s) be selected. Characters must be [set up](#--setup) with PurseStrings before adding them to the Party Members list.

## Merchant Setup
Merchants are NPCs that have items or services to sell. A Merchant has two requirements:
1. It must be a **token** that contains the Merchant's inventory (below) in the token's GM Notes, and
2. The token must represent a Character that has been [set up](#--setup) with PurseStrings.

As it is not required for the Merchant token to be the default token of the character, you have more flexibility and fewer character sheets to load. You can create a generic Character and use it with multiple tokens - they will all have different Inventory but use the same pool of money for transactions. If you wish to use a character as a Merchant, [see below](#characters-as-merchants).

You can now allow a Merchant's Inventory to override the [default show stock setting](#--stock) by adding "show-stock" or "hide-stock" to the first Bar 1 box on the token. This allows you to mix up inventory "types" such as a restaurant menu and a shopkeeper's stock.

To create a Merchant, follow the instructions below.
1. Select and Edit a token you wish to represent your Merchant.
2. Add "show-stock" or "hide-stock" to the first Bar 1 box, if desired.
3. Edit the token's GM Notes field.
4. The first line of Inventory must be either "PurseStrings Inventory" or "PurseStrings Menu" and nothing else. The dialog displayed through the [`--invlist`](#--invlist) command will give the name of the Merchant token along with either "Inventory" or "Menu" as you provide here.
5. Enter each item on its own line in the following manner:  
    *Item Name|price|quantity*  
If you wish to have an item that is "infinitely available" such as ale or services of any kind, leave the quantity blank:  
    *Item Name|price|*  
Price must be a single denomination, i.e. "2cp" or "1200gp" and not "2cp, 1200gp".
6. If you have multiple categories, you may add category headers by simply giving the category name its own line above the items of that category.
7. The PurseStrings inventory data *must* be the only data in the token's GM Notes field!
8. Click the 'Save Changes' button.

Here is an example GM Note for a small town blacksmith Merchant:
```
PurseStrings Inventory
Services
Sword Sharpening|2gp|
Armor Polishing|5gp|
Weapons
Dagger|2gp|5
Hand Axe|5gp|3
Shortsword|10gp|1
Adventuring Gear
Potion of Healing|50gp|4
Alchemist's Fire|50gp|2
```
If a Merchant buys an item from a player that is not already in their inventory, it will be added to the list. It is assumed that Merchants will buy at half their selling cost, so the inventory price on new items will be double the amount at which it was purchased. Updates to inventory outside of purchases may be done by editing the GM Notes field. See the [`--buy` command](#--buy) for options and information.

### Characters as Merchants
If you wish to use a character as a Merchant (as in previous versions of PurseStrings), you must make the Merchant token the *default token* for the character. There are two ways to ensure the Merchant's Inventory remains up-to-date on the character:
- If the Merchant token's name is the same as the character's name, the default token will be updated whenever inventory changes.
- If the names do not match, you will need to update the default token manually using the [`--update-merchant` command](#--update-merchant) **before** removing the token from the VTT.

## Syntax

`!ps <command>`

## Commands:
- **[--help](#--help)**
- **[--config](#--config)**
- **[--setup](#--setup)**
- **[--stock](#--stock)**
- **[--party](#--party)**
- **[--show](#--show)**
- **[--dist](#--dist)** <_coinage_>
- **[--add](#--add)** <_coinage_>
- **[--subt](#--subt)** <_coinage_>
- **[--give](#--give)** <_giver_id_> <_taker_id_> <_coinage_>
- **[--buy](#--buy)** <_buyer_id_> <_seller_id_> <_coinage_> <_item_>
- **[--invlist](#--invlist)** <_merchant_id_>
- **[--update-merchant](#--update-merchant)**

---
### --help
Whispers a PurseStrings help dialog in the chat window. It gives relative commands depending on whether the player is GM. The GM will also get a button to display the [Config Menu](#--config).

`!ps --help`

---
### --config
**GM Only** This gives you a short dialog menu with all of the PurseStrings configuration options so you can customize it for your game. It displays a list of your [Party Members](#--party), the **[stock](#--stock)** setting, and a link to add Party Members.

`!ps --config`

---
### --setup
**GM Only** The GM must setup all player characters and relevant NPCs before using PurseStrings. Select each token representing the character(s) you want to setup and run the following command. This command registers each character with the script, ensures the proper currency attributes exist, and adds a token action for calling the `--show` command ([below](#--show)) to view their Purse:

`!ps --setup`

If you wish to add a starting amount to the selected characters, you can optionally pass the coinage parameter along with the `--setup` command. Keep in mind the given amount will be added to every selected character. The following adds 50cp, 20sp, and 10gp to each selected character:

`!ps --setup 50:20:0:10:0`

---
### --stock
**GM Only** When a merchant's inventory is displayed, you can choose to either show the amount of each item in stock, or keep this information hidden. There is a default that applies to all Merchants that can be changed with the `--stock` command. Send "true" with this command if you wish to display the number of items in inventory, or "false" to prevent the inventory count from showing. The default value is "true." A link to toggle this setting is included in the `--config` dialog ([above](#--config)).

```
!ps --stock true
!ps --stock false
```

You may also set this value individually on each Merchant token. This is necessary if you wish to override the default. To do so, simply add "show-stock" or "hide-stock" to the first Bar 1 box on the token.

When you wish to show stock, items with a quantity of zero will display "out of stock." If you are hiding the stock count, the out of stock items will not be not displayed at all. Any items that have an "infinite availability" such as services ([see above](#merchant-setup)) will always be shown and will never display any quantity regardless of the this setting.

---
### --party
**GM Only** You may add characters you have [set up already](#--setup) to a Party Members list that persists between sessions. This will allow you to distribute loot ([below](#--dist)) without needing to select player tokens. To do this, select the tokens representing the characters you wish to add and use the following command:

`!ps --party`

You can use this command more than once in case you are in game and cannot select all of them at once. The command will simply add the new token to the list.

If you wish to remove characters from the Party Members list, you will essentially start over with a new group. Select the tokens you wish to keep and pass `--reset` along with the `--party` command:

`!ps --party --reset`

Passing the `--reset` command without tokens selected will *remove all characters from the list.*

---
### --show
To display the contents of a character's Purse, use the `--show` parameter. It will display Purse contents for all selected tokens, and shows the total weight of all coins for encumbrance purposes:

`!ps --show`

You may also send an optional `--whisper` command to make `--show` whisper the results. This is default when [setting up your characters](#--setup) for the first time.

`!ps --show --whisper`

---
### --dist
**GM Only** When the players have discovered treasure, you may use PurseStrings to distribute the coinage portion of the loot evenly among Party Members using `--dist` command. Coinage can be in any format above.

```
!ps --dist 156:280:0:666:0
!ps --dist 146sp, 398gp
```

The leftover coinage that remains when it cannot be evenly divided can either be dropped (so the players can decide amongst themselves who should receive the remainder) or given to a random Party Member. See the [drop](#--drop) command above. When leftover coins are dropped, this command will provide a GM-only "Give leftovers" link to conveniently call the `--add` command for the remaining coins. Select the recipient of the leftover coins and click the link.

---
### --add
**GM Only** To add coinage to a character(s) Purse, simply pass it with the `--add` parameter. The following adds 10gp to each selected character:

`!ps --add 10gp`

---
### --subt
**GM Only** To simply remove coinage from a character(s) Purse (without giving it to another character) you use the `--subt` parameter along with the amount of coinage you wish to remove. If the amount of the coinage is more than what that character has in their Purse, the operation will fail. The following subtracts 10gp from each selected character:

`!ps --subt 10gp`

Equivalences are used when determining what coins are removed. For instance, if the Purse has 50sp and 5gp and the amount to subtract is 6gp, the Purse will contain 40sp and 0gp once the subtraction is complete. A Purse with 2cp and 7sp can subtract 5cp and the script will borrow from larger denominations to make up the remainder, in this case leaving the Purse at 7cp and 6sp.

---
### --give
Characters can exchange money between themselves. You must send a token ID that represents both the giving character and the taking (receiving) character along with the amount being given. If you have a character that acts as a "bank" for the Party and does not have a token on the VTT, you can pass the character ID as a *taker only*.

`!ps --give --giver|<giver_id> --taker|<taker_id> --amt|50gp`

As with the `--subt` command ([above](#--subt)), the exchange will fail if the amount of the coinage is more than what the giver has in their Purse, and equivalences will be used for making change.

---
### --buy
Characters can also pay for goods & services as well. PurseStrings handles the monetary transaction along with the inventory for a NPC that has been set up as a Merchant ([see above](#merchants-setup)). Note that this *does not* add items to a player character's sheet, it only deals with the money.

To exchange money for an item or service, you use the `--buy` command along with the IDs of tokens representing both the buyer and the seller. Both IDs must be included as parameters because of the way the API handles targeted tokens. Also required is the amount for which the item is being sold using `--amt|<coinage>`, and the name of the item using `--item|<item_name>`.

`!ps --buy --buyer|<buyer_id> --seller|<seller_id> --amt|50gp --item|Potion of Healing`

You can send a category for the item by separating the name and category with a tilde symbol (~). This will allow you to categorize items that are not already in a Merchant's Inventory. If no category is sent, an "Uncategorized" category will be used.

`!ps --buy --buyer|<buyer_id> --seller|<seller_id> --amt|37gp --item|Greatsword~Weapons`

As with the `--subt` command ([above](#--subt)), the transaction will fail if the price is more than what the buyer has in their Purse, and equivalences will be used for making change.

The Inventory dialog for Merchants ([below](#--invlist)) outputs the proper code for all purchases from a Merchant. Players will simply click the "Buy" link in the Inventory dialog to make a purchase. Once the inventory has been updated, a new inventory list dialog will automatically be generated with any quantity changes.

---
### --invlist
**GM Only** You can display a Merchant's Inventory (see [setup instructions](#merchants-setup) above) using the `--invlist` command followed by the Merchant token's ID:

`!ps --invlist <merchant_id>`

This generates a dialog with the Merchant's inventory/menu and provides the item name, price, and a link the player's can use to make the purchase.

---
### --update-merchant
**GM Only** For characters you wish to use as a Merchant rather than multiple Merchant tokens sharing the same character ([see above](#characters-as-merchants)), you set the character's default token as the one that contains the Merchant's Inventory. In this manner, a Merchant can be quickly moved to the VTT from the Journal. Inventory will be updated automatically if the name on the default token is the same as the character's name. To update manually, use the `--update-merchant` command on the selected Merchant token **before** it is removed from the VTT.

`!ps --update-merchant`

This command is not necessary if the name of the Merchant token is the same as the character's, or if you otherwise have reason not to update inventory on the character.

## Notes

PurseStrings was developed on Shaped Sheet version 19.1.3 but should work with many previous versions as well.
