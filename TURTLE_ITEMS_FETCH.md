We need to get the full list of weapons and armor available for turtle wow. Turtle wow is a classic wow private server. The datastructure is similar to wowhead.

List of weapons:

- https://database.turtle-wow.org/?items=2
- to paginate, the structure is:
  - https://database.turtle-wow.org/?items=2#50+1
  - https://database.turtle-wow.org/?items=2#100+1
  - https://database.turtle-wow.org/?items=2#150+1

List of armor:

- https://database.turtle-wow.org/?items=4
  - paginate the same way: https://database.turtle-wow.org/?items=4#50+1

The output item structure should look like the below object, including the source (so we know what quest it may come from)

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
