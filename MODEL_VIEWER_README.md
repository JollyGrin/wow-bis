# WoW Model Viewer Component

A React component for displaying World of Warcraft character models with equipment visualization.

## Current Status

✅ **Working**: Basic UI with race/gender selection and equipment input  
✅ **Working**: CORS bypass server setup with Docker  
🚧 **Testing**: Full 3D model integration with wow-model-viewer  
❌ **Previous Attempts**: Direct ZamModelViewer integration failed due to CORS  

## Components

### 1. WowModelViewerFixed (Current Implementation)
**Location**: `app/components/WowModelViewerFixed.tsx`

A React component that properly integrates the wow-model-viewer library using a CORS bypass server.

**Features**:
- Full 3D WoW character models
- Equipment visualization
- Dynamic race/gender/item updates
- Proper error handling and loading states
- Follows wow-model-viewer documentation exactly

### 2. WowheadStaticViewer (Fallback)
**Location**: `app/components/WowheadStaticViewer.tsx`

A placeholder component used during development and as a fallback.

### 3. Demo Page
**Location**: `app/model-viewer/page.tsx`

A complete demo showcasing the model viewer with:
- Race/gender selector (Human, Orc, Dwarf, Night Elf, etc.)
- Equipment slots for all gear pieces
- Preset buttons for Warrior, Rogue, and Mage sets
- Real-time updates when changing configuration

## Working Solution: Next.js CORS Proxy

### Setup Instructions

1. **No additional setup required!** The CORS proxy is built into Next.js API routes.

2. **Environment Configuration**:
   The component automatically sets:
   ```javascript
   window.CONTENT_PATH = '/api/wowhead-proxy/modelviewer/live/';
   window.WOTLK_TO_RETAIL_DISPLAY_ID_API = 'https://wotlk.murlocvillage.com/api/items';
   ```

3. **Script Loading**:
   - WH mock object (inline script, loaded first)
   - jQuery 3.6.0 (via CDN)
   - ZamModelViewer (via Next.js proxy): `/api/wowhead-proxy/modelviewer/live/viewer/viewer.min.js`

4. **WH Mock Object**:
   The ZamModelViewer expects a global `WH` object with specific methods. Since the ZamModelViewer script can overwrite our mock, we use a persistence strategy:
   
   **Before scripts load:**
   ```javascript
   function createWHMock() { /* complete WH structure */ }
   window.WH = createWHMock();
   window._originalWHMock = createWHMock(); // Backup copy
   ```
   
   **After ZamModelViewer loads:**
   ```javascript
   // Restore WH mock if it was overwritten
   if (!window.WH || typeof window.WH.debug !== 'function') {
     window.WH = window._originalWHMock;
   }
   ```

### How the Proxy Works

The Next.js API route at `/api/wowhead-proxy/[...path]/route.ts` acts as a CORS bypass by:
- Accepting requests from the frontend
- Forwarding them to `https://wow.zamimg.com` with proper headers
- Adding CORS headers to the response
- Handling different content types (JSON, JavaScript, binary)
- Preserving caching headers for performance

### Advantages of Next.js Proxy vs Docker

✅ **No Docker dependency** - Works with just `pnpm dev`  
✅ **Simpler deployment** - Deploys with your Next.js app  
✅ **Better integration** - Native TypeScript support and error handling  
✅ **Easier debugging** - Logs appear in your Next.js console  
✅ **Production ready** - Automatically works in production builds  
✅ **Performance** - Fewer network hops, better caching control

### Character Data Format

The component uses the exact format specified in wow-model-viewer docs:
```javascript
const character = {
  race: 1,           // Race ID (1=Human, 2=Orc, etc.)
  gender: 0,         // 0=Female, 1=Male  
  skin: 1,           // Skin color
  face: 0,           // Face style
  hairStyle: 1,      // Hair style
  hairColor: 1,      // Hair color
  facialStyle: 0,    // Facial hair (for males)
  items: [           // [[slot, itemId], ...]
    [1, 18817],      // Head
    [5, 16905],      // Chest
    [16, 19019],     // Main Hand
    // ...
  ]
};
```

## Previous Attempts & Issues (For Reference)

### Attempt 1: wow-model-viewer npm package
**Package**: `wow-model-viewer@1.5.2`
**Status**: ❌ Failed

**Issues Encountered**:
1. **SSR Problem**: `window is not defined` during server-side rendering
   - **Solution Tried**: Dynamic imports with client-side only loading
   - **Result**: Partially resolved but led to more issues

2. **Missing Dependencies**: `WH.debug is not a function`
   - **Error**: Package expects Wowhead's global WH object
   - **Solution Tried**: Created mock WH object with required methods
   - **Result**: Still had missing properties

3. **jQuery Dependency**: ZamModelViewer requires jQuery but package doesn't load it
   - **Solution Tried**: Added jQuery via CDN before model viewer script
   - **Result**: Improved but still had data format issues

### Attempt 2: Direct ZamModelViewer Integration
**Library**: Wowhead's ZamModelViewer (via CDN)
**Status**: ❌ Failed

**Issues Encountered**:
1. **CORS Blocking**: 
   ```
   Access to fetch at 'https://wow.zamimg.com/modelviewer/live/meta/charactercustomization/1.json' 
   from origin 'http://localhost:3000' has been blocked by CORS policy
   ```
   - **Solution Tried**: Created Next.js API proxy route (`/api/modelviewer/[...path]/route.ts`)
   - **Result**: Proxy worked for some requests but metadata format was wrong

2. **Missing Race Data**: `Cannot read properties of undefined (reading 'Race')`
   - **Solution Tried**: Created mock race data endpoints and WH object mocking
   - **Result**: Still couldn't provide all expected data structures

3. **Complex Data Dependencies**: ZamModelViewer expects complex nested data structures that are hard to mock
   - **Wowhead Integration**: The viewer is tightly coupled to Wowhead's backend systems

### Attempt 3: Iframe Embedding
**Approach**: Embed Wowhead dressing room in iframe
**Status**: ❌ Failed

**Issue**: 
```
Refused to display 'https://www.wowhead.com/' in a frame because it set 'X-Frame-Options' to 'deny'
```
- **Cause**: Wowhead blocks iframe embedding for security reasons
- **No Solution**: This is a deliberate restriction by Wowhead

## Technical Architecture

### File Structure
```
app/
├── components/
│   ├── WowModelViewerFixed.tsx     # ✅ Current working component
│   ├── WowheadStaticViewer.tsx     # Fallback component
│   ├── WowModelViewer.tsx          # ❌ Failed ZamModelViewer attempt
│   ├── SimpleModelViewer.tsx       # ❌ Failed direct integration attempt  
│   ├── WowheadModelViewer.tsx      # ❌ Failed iframe attempt
│   └── WowheadWidget.tsx           # ❌ Failed widget attempt
├── model-viewer/
│   └── page.tsx                    # Demo page
└── api/
    ├── wowhead-proxy/
    │   └── [...path]/route.ts      # ✅ Next.js CORS proxy (working!)
    └── modelviewer/                # ❌ Old proxy attempts
        ├── [...path]/route.ts      # (no longer used)
        └── meta/
            ├── character/[id]/route.ts
            └── races/route.ts
```

### Dependencies Added
- `wow-model-viewer@1.5.2` (✅ Now working with Next.js proxy!)
- jQuery 3.6.0 (via CDN, required by ZamModelViewer)
- ZamModelViewer (via Next.js proxy, functional)

## Interfaces

### ItemSlots
```typescript
interface ItemSlots {
  head?: number;
  neck?: number;
  shoulder?: number;
  // ... all equipment slots
  mainHand?: number;
  offHand?: number;
  ranged?: number;
  tabard?: number;
}
```

### Component Props
```typescript
interface ModelViewerProps {
  race: number;        // 1=Human, 2=Orc, etc.
  gender: number;      // 0=Male, 1=Female
  items: ItemSlots;    // Equipment item IDs
  width?: number;      // Default: 600
  height?: number;     // Default: 800
  className?: string;
}
```

## Sample Data

### Race IDs
- 1: Human
- 2: Orc  
- 3: Dwarf
- 4: Night Elf
- 5: Undead
- 6: Tauren
- 7: Gnome
- 8: Troll
- 10: Blood Elf
- 11: Draenei

### Sample Equipment Sets

#### Warrior Set (Wrath Gear)
```javascript
{
  head: 16963,     // Helm of Wrath
  shoulder: 16961, // Pauldrons of Wrath
  chest: 16966,    // Breastplate of Wrath
  legs: 16962,     // Legplates of Wrath
  // ...
  mainHand: 19019, // Thunderfury
  offHand: 19349,  // Elementium Reinforced Bulwark
}
```

## Next Steps & Potential Solutions

### Option 1: Alternative 3D Libraries
- **Three.js**: Build custom WoW model viewer using extracted game assets
- **Babylon.js**: Another WebGL framework that might handle WoW models
- **WebGL**: Direct WebGL implementation for maximum control

### Option 2: Server-Side Rendering
- Generate character images on server using headless browser
- Cache rendered images for common configurations
- Faster loading but less interactive

### Option 3: Official Blizzard APIs  
- Investigate if Blizzard has official character rendering APIs
- May require API keys and have rate limits
- More reliable but potentially limited

### Option 4: Static Image Generation
- Pre-generate images for common race/gender/equipment combinations
- Fast and reliable but limited customization
- Good fallback option

## Development Notes

### Error Patterns to Watch For
1. **SSR Issues**: Any `window` or `document` usage needs client-side guards
2. **CORS Problems**: External APIs may need proxy routes
3. **Missing Dependencies**: 3rd party libraries often assume global objects exist
4. **Data Format Mismatches**: Mock data must exactly match expected formats

### Working Development Server Commands
```bash
# Just start the Next.js development server (no Docker needed!)
pnpm dev

# Other useful commands
pnpm build        # Test production build
pnpm lint         # Check code quality
pnpm typecheck    # Verify TypeScript
```

### Useful Debug URLs
- Demo page: `http://localhost:3000/model-viewer`
- Next.js proxy test: `http://localhost:3000/api/wowhead-proxy/modelviewer/live/viewer/viewer.min.js`
- Character metadata test: `http://localhost:3000/api/wowhead-proxy/modelviewer/live/meta/character/1-0.json`

## Lessons Learned

1. **Third-party model viewers are complex**: They often depend on specific backend infrastructures that are hard to replicate
2. **CORS is a major blocker**: Client-side model viewers that fetch data from external APIs will hit CORS issues
3. **Mock data is insufficient**: Complex libraries expect very specific data formats and relationships
4. **Server-side proxies help but don't solve everything**: Proxying can bypass CORS but doesn't solve data format issues
5. **Start simple**: A working placeholder is better than a broken 3D viewer

## Current Recommendation

Continue with the current static viewer implementation while researching alternative 3D solutions. The existing UI provides a solid foundation for when a working 3D model integration is found.