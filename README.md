# 3D Spherical Quadrature Visualization

A high-performance Three.js implementation for interactive visualization of spherical quadrature methods and numerical integration on the unit sphere. Features dynamic 3D rendering with real-time computation and error analysis.

## Features

### Quadrature Methods
- **Monte Carlo**: Random points on the sphere
- **Lebedev**: Spherical quadrature with octahedral symmetry
- **Product Quadrature**: Cartesian product of 1D quadratures (Gauss-Legendre × Trapezoidal)
- **Spherical Design**: Points with optimal spherical distribution properties

### Test Functions
- **Polynomial**: f = 1 + x + y² + x²y + x⁴ + y⁵ + x²y²z²
- **Gaussian Peaks**: Sum of Gaussian functions with different centers
- **Hyperbolic Tangent**: Smooth step function
- **Sign Functions**: Step function

## Usage

### Controls
- **Mouse**: Drag to rotate the sphere manually.

### Quadrature Methods
1. **Monte Carlo**: Statistical sampling approach
   - Uniform: Correctly distributed points
   - Clustered: Demonstrates improper sampling

2. **Lebedev**: Exact integration of spherical harmonics up to degree 2n-1

3. **Spherical Designs**: t-designs integrate exactly all spherical harmonics up to degree t

4. **Product Quadrature**: Combines 1D methods for φ and θ directions

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
- Convergence behavior of numerical integration methods

## Future Plans

- *Schema Editor:* Allow users to edit grid schema manually or generate them with functions and export those schemas.
- *Function Input:* Allow users to input functions have them be integrated on and tested against analytical solution if provided.
