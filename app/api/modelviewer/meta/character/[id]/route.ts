import { NextRequest, NextResponse } from 'next/server';

// Mock character metadata for different race-gender combinations
const CHARACTER_DATA: Record<string, any> = {
  '1-0': { // Human Male
    race: 1,
    gender: 0,
    skin: [1, 2, 3, 4, 5],
    face: [1, 2, 3, 4, 5],
    hairStyle: [1, 2, 3, 4, 5, 6, 7, 8],
    hairColor: [1, 2, 3, 4, 5, 6, 7, 8],
    facialStyle: [1, 2, 3, 4, 5],
    customization: []
  },
  '1-1': { // Human Female
    race: 1,
    gender: 1,
    skin: [1, 2, 3, 4, 5],
    face: [1, 2, 3, 4, 5],
    hairStyle: [1, 2, 3, 4, 5, 6, 7, 8],
    hairColor: [1, 2, 3, 4, 5, 6, 7, 8],
    facialStyle: [],
    customization: []
  },
  // Add more race-gender combinations as needed
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Return mock data for known race-gender combinations
  if (CHARACTER_DATA[id]) {
    return NextResponse.json(CHARACTER_DATA[id], {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  
  // For unknown combinations, return basic structure
  const [race, gender] = id.split('-').map(Number);
  return NextResponse.json({
    race,
    gender,
    skin: [1, 2, 3, 4],
    face: [1, 2, 3, 4],
    hairStyle: [1, 2, 3, 4, 5],
    hairColor: [1, 2, 3, 4, 5],
    facialStyle: gender === 0 ? [1, 2, 3] : [],
    customization: []
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}