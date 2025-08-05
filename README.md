# 3D Spherical Quadrature Visualization

A high-performance Three.js implementation for interactive visualization of spherical quadrature methods and numerical integration on the unit sphere. Features dynamic 3D rendering with real-time computation and error analysis.

## Features

### Visualization Modes
- **Spherical Harmonics**: Interactive visualization of spherical harmonic functions Y_l^m
- **Quadrature Points**: Display of integration points for different quadrature methods
- **Test Functions**: Visualization of various test functions used to evaluate quadrature accuracy

### Quadrature Methods
- **Monte Carlo (Uniform)**: Uniformly distributed random points on the sphere
- **Monte Carlo (Clustered)**: Incorrectly distributed points showing clustering effects
- **Lebedev**: Spherical quadrature with octahedral symmetry
- **Product Quadrature**: Cartesian product of 1D quadratures (Gauss-Legendre × Trapezoidal)
- **Spherical Design**: Points with optimal spherical distribution properties

### Test Functions
- **Polynomial**: f = 1 + x + y² + x²y + x⁴ + y⁵ + x²y²z²
- **Gaussian Peaks**: Sum of Gaussian functions with different centers
- **Hyperbolic Tangent**: Smooth step function
- **Spherical Harmonics**: For testing orthogonality properties

## Usage

### Controls
- **Mouse**: Drag to rotate the sphere manually
- **Keyboard Shortcuts**:
  - `1`: Load spherical harmonics demo
  - `2`: Load quadrature points comparison
  - `3`: Load function integration demo
  - `Space`: Toggle auto-rotation
  - `R`: Reset rotation

### Integration
Click "Compute Integral" to numerically integrate the current function using the selected quadrature method. The results show:
- Numerical approximation
- Analytical value (when known)
- Absolute and relative errors

## Mathematical Background

### Spherical Integration
The normalized integral over the unit sphere is:
```
I = (1/4π) ∫₀²π ∫₀π f(θ,φ) sin(φ) dφ dθ
```

### Spherical Harmonics
Spherical harmonics Y_l^m(θ,φ) form a complete orthonormal basis on the sphere:
```
∫ Y_l^m Y_l'^m' dΩ = δ_ll' δ_mm'
```

### Quadrature Methods

1. **Monte Carlo**: Statistical sampling approach
   - Uniform: Correctly distributed points
   - Clustered: Demonstrates improper sampling

2. **Lebedev**: Exact integration of spherical harmonics up to degree 2n-1

3. **Spherical Designs**: t-designs integrate exactly all spherical harmonics up to degree t

4. **Product Quadrature**: Combines 1D methods for φ and θ directions

## Files Structure

- `index.html`: Main HTML interface
- `three-sketch.js`: Three.js main application and rendering functions
- `three-controls.js`: Three.js OrbitControls implementation
- `sphere-quadrature.js`: Implementation of integration methods
- `spherical-harmonics.js`: Spherical harmonic calculations
- `test-functions.js`: Mathematical test functions
- `ui-controls.js`: User interface event handlers

## Technical Implementation

### Coordinate Systems
- Spherical coordinates: (r, θ, φ) where θ is azimuthal, φ is polar
- Cartesian coordinates: (x, y, z) = (sin φ cos θ, sin φ sin θ, cos φ)
- Three.js world coordinates with proper depth sorting and camera controls

### Numerical Methods
- Associated Legendre polynomials computed via recurrence relations
- Gauss-Legendre quadrature points and weights
- Random number generation for Monte Carlo methods
- Golden spiral for spherical design approximation
- High-performance GPU-accelerated rendering with Three.js

## Educational Value

This visualization helps understand:
- How different quadrature methods distribute points on the sphere
- The relationship between point distribution and integration accuracy
- Properties of spherical harmonics and their visualization
- Convergence behavior of numerical integration methods

## Browser Compatibility

Requires a modern web browser with WebGL support for 3D rendering. Three.js provides excellent cross-browser compatibility:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Enhanced performance on all platforms compared to p5.js implementation

## Related Work

Based on the Python implementation by Casper Beentjes:
- Original repository: [Quadratures on Unit Sphere](https://github.com/cbeentjes/quadratures-on-unit-sphere)
- Essay: [Numerical Integration on the Sphere](http://people.maths.ox.ac.uk/beentjes/Essays/)

## License

This code is provided for educational purposes. See individual function implementations for specific mathematical references and citations.