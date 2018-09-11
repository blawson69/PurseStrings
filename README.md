# PurseStrings

This [Roll20](http://roll20.net/) script handles currency and currency exchanges for characters using the 5e Shaped Sheet. It adds fields to each character which act as a "Purse" for storing the requisite cp, sp, gp, ep, and pp, and will add/substract from them appropriately when collecting loot, paying for goods/services, etc.

### Coinage
Coinage can be sent as either a list of amounts & denominations (no commas), or as a shorthand list with a colon separating the amounts in denominational order from smallest to largest with zeros for placeholders (no spaces).

Both of the examples below represent 30cp and 4gp:
* 30cp 4gp
* 30:0:0:4:0

### Syntax

```!ps <parms>```

### Parameters:
* **--setup**
* **--show**
* **--add** <_coinage_>
* **--dist** <_coinage_>
* **--subt** <_coinage_>
* **--buy** <_buyer_> <_seller_> <_coinage_>

---
The GM must setup player characters and all relevant NPCs before using PurseStrings. You must select each token representing the character(s) you want to setup and run the following command. This will add the necessary attributes to the character sheet(s):

```!ps --setup```

If you wish to add a starting amount to the selected characters, you can optionally pass the coinage parameter along with the --setup command. Keep in mind the amount will be added to each selected character. The following adds 50cp, 20sp, and 10gp to each character you setup:

```!ps --setup 50:20:0:10:0```

---

To add coinage to a character(s) Purse, simply pass it with the --add parameter. The following adds 10gp to each selected character:

```!ps --add 10gp```

---

When the players have discovered treasure, you may use PurseStrings to distribute the coinage portion of the loot evenly amongst the party. All party members must be selected to run the command:

```!ps --dist 156:280:0:666:0```

The leftover coinage that remains when it cannot be evenly divided can either be dropped so the players can decide who should recieve the remainder, or given to a randomly selected member of the group. To configure this there is a ```dropChange``` variable at the beginning which toggles this behavior on or off. Set it to "true" if you want the leftover coinage to be dropped or "false" to give it to a random character.

---

To remove coinage from a character(s) Purse you use the --subt parameter along with the amount of coinage you wish to remove. If the amount of the coinage is more than what that character has in their Purse, the operation will fail. The following subtracts 10gp from each selected character:

```!ps --subt 10gp```

Eqivalencies are used when determining what coins are removed. For instance, if the Purse has 50sp and 5 gp and the amount to subtract is 5gp, the Purse will contain 40sp and 0 gp once the subtraction is complete.

---

Characters can also exchange money. This can be either simple gifting of money between players or for the purchase of goods & services from a NPC. PurseStrings doesn't care about inventory, it just handles the monetary transaction.

To exchange money, you use the --buy parameter along with the character ID of both the buyer and the seller. Both IDs must be included as parameters because of the way the API handles targeted tokens. The first ID passed is that of the buyer character, the second is that of the seller. As always, the coinage is sent last.

```!ps --buy @{selected|character_id} @{target|character_id} 50gp```

As with the --subt parameter, the transaction will fail if the amount of the coinage is more than what that character has in their Purse.

### Notes

PurseStrings was developed on Shaped Sheet version 19.1.3 but should work with many previous versions as well. It also assumes the use of the standard SRD monetary system. It also does not interact with the coinage visible in the character sheet. In fact, the lack of access to those values is the sole purpose of this script. As such, any amounts entered in those fields will be ignored.