import { WeaponSpeedEnhancer } from './enhance-weapons-speed-dps';

async function testSingleFile() {
  const enhancer = new WeaponSpeedEnhancer();
  
  try {
    await enhancer.initialize();
    // Test on the smallest weapon file first
    await enhancer.enhanceWeaponFile('turtle_db/items/weapons/fist.json');
  } catch (error) {
    console.error('💥 Enhancement failed:', error);
  } finally {
    await enhancer.cleanup();
  }
}

testSingleFile().catch(console.error);