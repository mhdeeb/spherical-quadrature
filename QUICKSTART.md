# Quick Start Guide

## Running the Application

### Option 1: Simple HTTP Server (Recommended)
```bash
cd p5-quad
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 2: Using Node.js
```bash
cd p5-quad
npx serve .
```

### Option 3: Using Live Server (with auto-reload)
```bash
cd p5-quad
npx live-server .
```

## First Steps

1. **Open the application** in your web browser
2. **Try the preset configurations** using keyboard shortcuts:
   - Press `1` for Spherical Harmonics demo
   - Press `2` for Quadrature Points comparison
   - Press `3` for Function Integration demo

3. **Interact with the sphere**:
   - **Left-click and drag**: Rotate the sphere
   - **Scroll wheel**: Zoom in/out
   - **Auto-rotation**: Toggle in controls panel
   - **Smooth orbit controls**: Powered by Three.js

## Quick Demonstration

### Spherical Harmonics
1. Set "Visualization Mode" to "Spherical Harmonics"
2. Adjust l (degree) and m (order) sliders
3. Enable "Color Mapping" to see the harmonic patterns
4. Try different harmonics like Y₂² or Y₃¹

### Quadrature Methods
1. Set "Visualization Mode" to "Quadrature Points"
2. Try different methods: "Monte Carlo (Uniform)" vs "Monte Carlo (Clustered)"
3. Observe how point distributions differ
4. Increase "Number of Points" to see convergence

### Function Integration
1. Set "Visualization Mode" to "Test Function"
2. Choose "Gaussian Peaks" function
3. Click "Compute Integral" to see numerical results
4. Compare different quadrature methods for accuracy

## Understanding the Results

### Integration Accuracy
- **Numerical**: Computer approximation
- **Analytical**: Exact mathematical result (when known)
- **Error**: Absolute difference
- **Relative Error**: Percentage difference

### Quadrature Comparison
- **Monte Carlo**: Random sampling, slow convergence
- **Lebedev**: Exact for spherical harmonics up to degree 2n-1
- **Spherical Design**: Optimal point distribution
- **Product Quadrature**: Combines 1D methods

## Common Issues

### Browser Compatibility
- Requires WebGL support
- Works best in Chrome, Firefox, Safari, Edge
- Disable adblockers if rendering issues occur

### Performance
- Reduce "Number of Points" if slow
- Disable "Color Mapping" for faster rendering
- Close other browser tabs for better performance

## Mouse Controls
- **Left-click + Drag**: Orbit around sphere
- **Scroll Wheel**: Zoom in/out  
- **Keyboard**: `1`, `2`, `3` for preset configurations
- **Smooth orbital motion**: Damped controls for professional feel

## Next Steps
- Experiment with different parameter values
- Compare integration accuracy across methods
- Try creating custom test functions
- Study the relationship between point distribution and accuracy

Enjoy exploring spherical quadrature methods!