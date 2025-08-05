# Migration from p5.js to Three.js

## Overview
The spherical quadrature visualization has been migrated from p5.js to Three.js for improved 3D performance, better depth handling, and more robust rendering capabilities.

## Key Improvements

### Performance
- **GPU Acceleration**: Three.js provides better WebGL optimization
- **Depth Buffer**: Proper Z-buffer handling eliminates rendering artifacts
- **Geometry Efficiency**: Three.js BufferGeometry for optimal memory usage
- **Material System**: Advanced shader-based materials for better visual quality

### User Experience
- **Orbit Controls**: Professional camera controls with smooth damping
- **Zoom Support**: Mouse wheel zooming with proper perspective
- **Rotation Stability**: No more visual breaking during rotation
- **Cross-Browser**: Better compatibility across all modern browsers

## Technical Changes

### Rendering Pipeline
```javascript
// OLD (p5.js): Manual depth buffer manipulation
drawingContext.enable(drawingContext.DEPTH_TEST);
drawingContext.polygonOffset(-1.0, -1.0);

// NEW (Three.js): Automatic depth sorting
renderer.render(scene, camera);
```

### Coordinate System
```javascript
// OLD (p5.js): createVector objects
points.push(createVector(x, y, z));

// NEW (Three.js): Native JavaScript objects → Three.js Vectors
points.push({x: x, y: y, z: z});
quadraturePoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
```

### Camera Controls
```javascript
// OLD (p5.js): Manual mouse handling
rotationX += (pmouseY - mouseY) * 0.01;
rotationY += (mouseX - pmouseX) * 0.01;

// NEW (Three.js): Professional orbit controls
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
```

## File Changes

### Removed Files
- `sketch.js` (p5.js main sketch)

### New Files
- `three-sketch.js` (Three.js main application)
- `three-controls.js` (OrbitControls implementation)

### Modified Files
- `index.html` (Updated CDN links and container structure)
- `ui-controls.js` (Updated event handlers for Three.js)
- `sphere-quadrature.js` (Coordinate system compatibility)
- `README.md` & `QUICKSTART.md` (Updated documentation)

## Benefits Achieved

1. **Stable Rotation**: No more visual artifacts during camera movement
2. **Better Performance**: Faster rendering with GPU acceleration
3. **Professional Controls**: Industry-standard orbit controls
4. **Robust Depth Sorting**: Proper layer rendering without z-fighting
5. **Enhanced Compatibility**: Better support across browsers and devices

## Backward Compatibility
All mathematical functions, quadrature methods, and UI controls remain identical. Only the rendering engine has changed, providing the same educational content with superior visual quality.

## Future Enhancements
The Three.js foundation enables:
- Advanced shader effects
- Post-processing pipelines  
- VR/AR compatibility
- Advanced lighting models
- Real-time shadows

The migration maintains all educational value while significantly improving the technical foundation and user experience.