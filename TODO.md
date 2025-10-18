ISSUES TO FIX:

### turtle wow items

- need to get data from https://database.turtle-wow.org/ as this is the version of items i wish to use
- need to just scrape one time to make a json
- if an equippable item does not have a required level, find which quest rewards it and get the min level from that (perhaps we do this in a 2nd step)

### one-hand/main-hand

- having inconsistency with one-hand/main-hand. Analyze all the weapon groupings and come up with a new strategy to simplify. We can collapse some categories into each other

---

oct 18

setup scraping on turtle wow to extract

- ids from the categories of armor and weapons
- extract data from ids
- get quest source (name of quest and id)

next step will be to get the quest source, find the min required level, and use that for the item min required level

bugs in processing ids still. Run tests and compare.

- says everything is common
