import { NextResponse } from 'next/server';

// Mock races data that ZamModelViewer expects
const RACES_DATA = {
  "1": {
    "Race": 1,
    "Name": "Human",
    "Side": 0,
    "FileString": "human",
    "StringMale": "Human",
    "StringFemale": "Human"
  },
  "2": {
    "Race": 2,
    "Name": "Orc",
    "Side": 1,
    "FileString": "orc",
    "StringMale": "Orc",
    "StringFemale": "Orc"
  },
  "3": {
    "Race": 3,
    "Name": "Dwarf",
    "Side": 0,
    "FileString": "dwarf",
    "StringMale": "Dwarf",
    "StringFemale": "Dwarf"
  },
  "4": {
    "Race": 4,
    "Name": "Night Elf",
    "Side": 0,
    "FileString": "nightelf",
    "StringMale": "Night Elf",
    "StringFemale": "Night Elf"
  },
  "5": {
    "Race": 5,
    "Name": "Undead",
    "Side": 1,
    "FileString": "undead",
    "StringMale": "Undead",
    "StringFemale": "Undead"
  },
  "6": {
    "Race": 6,
    "Name": "Tauren",
    "Side": 1,
    "FileString": "tauren",
    "StringMale": "Tauren",
    "StringFemale": "Tauren"
  },
  "7": {
    "Race": 7,
    "Name": "Gnome",
    "Side": 0,
    "FileString": "gnome",
    "StringMale": "Gnome",
    "StringFemale": "Gnome"
  },
  "8": {
    "Race": 8,
    "Name": "Troll",
    "Side": 1,
    "FileString": "troll",
    "StringMale": "Troll",
    "StringFemale": "Troll"
  },
  "10": {
    "Race": 10,
    "Name": "Blood Elf",
    "Side": 1,
    "FileString": "bloodelf",
    "StringMale": "Blood Elf",
    "StringFemale": "Blood Elf"
  },
  "11": {
    "Race": 11,
    "Name": "Draenei",
    "Side": 0,
    "FileString": "draenei",
    "StringMale": "Draenei",
    "StringFemale": "Draenei"
  }
};

export async function GET() {
  return NextResponse.json(RACES_DATA, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}