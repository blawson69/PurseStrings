# PurseStrings

This script handles currency and currency exchanges for characters using the 5e Shaped Sheet. It adds fields to each character which act as a "purse" for storing the requisite cp, sp, gp, ep, and pp, and will add/substract from them appropriately when collecting loot, paying for goods/services, etc.

### Coinage syntax
Coinage can be sent as either a list of amount/demonimations (no commas) or as a shorthand list with a colon separating the amounts in denomination order with zeros for placeholders (no spaces).

**Examples**
Both of the examples below represent 30cp and 4gp:
* 30cp 4gp
* 30:0:0:4:0

### Syntax

```!ps <parms>```

### Parameters:
* **--setup**
* **--show**
* **--add** <_coinage_>
* **--subt** <_coinage_>
* **--buy** <_buyer_> <_seller_> <_coinage_>

---
You must setup player characters and NPCs before using PurseStrings. Currently, you must select the characters you want to setup and run the following command. This will add the necessary attributes to the character sheet:

```!ps --setup```

If you wish to add a starting amount to the characters, you can optionally pass the coinage parameter along with the --setup command. Keep in mind the amount will be added to each character. The following adds 50cp, 20sp, and 10gp to each character you setup:

```!ps --setup 50:20:0:10:0```

---

To add coinage to a character(s) purse, simply pass it with the --add parameter:

```!ps --add 50:20:0:10:0```

---

To remove coinage from a character(s) purse you use the --subt parameter along with the amount of coinage you wish to remove. If the amount of the coinage is more than what that character has in their purse, the operation will fail.

```!ps --subt 50:20:0:10:0```

---

Characters can also exchange money. This can be either simple gifting of money or for the purchase of goods & services. PurseStrings doesn't care about inventory. It just handles the monetary transaction.

To exchange money, you use the --buy parameter along with the character ID of both the buyer and the seller. Both IDs must be included as parameters because of the way the API works with selected tokens. The first ID passed is that of the buyer character, the second is that of the seller. As always, the coinage is sent last.

```!ps --buy @{selected|character_id} @{target|character_id} 50gp```

As with the --subt parameter, the transaction will fail if the amount of the coinage is more than what that character has in their purse.

### Notes

PurseStrings was developed on Shaped Sheet version 19.1.3 but should work with many previous versions as well. It also assumes the use of the standard SRD monetary system. It also does not interact with the coinage visible in the character sheet. In fact, the lack of access to those values is the sole purpose of this script. As such, any amounts entered in those fields will be ignored.