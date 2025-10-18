We need to get the full list of weapons and armor available for turtle wow. Turtle wow is a classic wow private server. The datastructure is similar to wowhead.

Weapons:

- (1h axe) https://database.turtle-wow.org/?items=2.0
- (2h axe) https://database.turtle-wow.org/?items=2.1
- (...)
- (wands) https://database.turtle-wow.org/?items=2.19
- (fishing poles) https://database.turtle-wow.org/?items=2.20

Armor:

- (shields) https://database.turtle-wow.org/?items=4.6.14
- (amulets) https://database.turtle-wow.org/?items=4.0.2
- (cloaks) https://database.turtle-wow.org/?items=4.1.16
- (rings) https://database.turtle-wow.org/?items=4.0.11
- (trinkets) https://database.turtle-wow.org/?items=4.0.12

- (cloth - head) https://database.turtle-wow.org/?items=4.1.1
- (there is no 4.1.2)
- (cloth - shoulder) https://database.turtle-wow.org/?items=4.1.3
- (4.1.3 is just 2 shirts)
- (cloth - chest) https://database.turtle-wow.org/?items=4.1.5
- (cloth - waist) https://database.turtle-wow.org/?items=4.1.6
- (cloth - legs) https://database.turtle-wow.org/?items=4.1.7
- (cloth - feet) https://database.turtle-wow.org/?items=4.1.8
- (cloth - wrist) https://database.turtle-wow.org/?items=4.1.9
- (cloth - hands) https://database.turtle-wow.org/?items=4.1.10

- (leather - head) https://database.turtle-wow.org/?items=4.2.1
- (leather - shoulder) https://database.turtle-wow.org/?items=4.2.3
- (... same pattern)

- (mail 4.3.x)
- (plate 4.4.x)

How to Paginate:

- https://database.turtle-wow.org/?items=2.0
- to paginate, the structure is:
  - https://database.turtle-wow.org/?items=2.0#50+1
  - https://database.turtle-wow.org/?items=2.0#100+1
  - https://database.turtle-wow.org/?items=2.0#150+1

The output item structure should look like the below object, including the source (so we know what quest it may come from)

---

the below section is how the item data is extracted per id (only happens after getting all the ids)

```json
{
  "itemId": 16977,
  "name": "Warsong Boots",
  "icon": "inv_boots_05",
  "class": "Armor",
  "subclass": "Leather",
  "sellPrice": 1536,
  "quality": "Rare",
  "itemLevel": 27,
  "requiredLevel": 0, // <-- This is the problem!
  "slot": "Feet",
  "tooltip": [
    {
      "label": "Warsong Boots"
    },
    {
      "label": "Phase 1",
      "format": "alignRight"
    },
    {
      "label": "Item Level 27",
      "format": "Misc"
    },
    {
      "label": "Binds when picked up"
    },
    {
      "label": "Feet"
    },
    {
      "label": "Leather",
      "format": "alignRight"
    },
    {
      "label": "67 Armor"
    },
    {
      "label": "+8 Agility"
    },
    {
      "label": "+6 Stamina"
    },
    {
      "label": "Durability 45 / 45"
    },
    {
      "label": "Sell Price:"
    }
  ],
  "itemLink": "|cff0070dd|Hitem:16977::::::::::0|h[Warsong Boots]|h|r",
  "contentPhase": 1,
  "source": {
    "category": "Quest",
    "quests": [
      {
        "questId": 6571, // <-- We have the quest ID!
        "name": "Warsong Supplies", // <-- We have the quest name!
        "faction": "Horde" // <-- We have faction info!
      }
    ]
  },
  "uniqueName": "warsong-boots"
}
```
