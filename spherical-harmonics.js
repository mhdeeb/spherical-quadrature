// Spherical harmonics implementation

// Export for ES6 modules
export { sphericalHarmonic, evaluateSphericalHarmonic };

// Associated Legendre polynomials
function associatedLegendre(l, m, x) {
    // Compute P_l^m(x) using recurrence relations
    if (m < 0 || m > l || Math.abs(x) > 1) return 0;

    // Base cases
    if (l === 0) return 1;
    if (l === 1) {
        if (m === 0) return x;
        if (m === 1) return -Math.sqrt(1 - x * x);
    }

    // For higher orders, use recursion
    let pmm = 1;
    if (m > 0) {
        let somx2 = Math.sqrt((1 - x) * (1 + x));
        let fact = 1;
        for (let i = 1; i <= m; i++) {
            pmm *= -fact * somx2;
            fact += 2;
        }
    }

    if (l === m) return pmm;

    let pmmp1 = x * (2 * m + 1) * pmm;
    if (l === m + 1) return pmmp1;

    let pll = 0;
    for (let ll = m + 2; ll <= l; ll++) {
        pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
        pmm = pmmp1;
        pmmp1 = pll;
    }

    return pll;
}

// Spherical harmonic Y_l^m(theta, phi)
function sphericalHarmonic(l, m, theta, phi) {
    // Real spherical harmonics
    if (m === 0) {
        return sphericalHarmonicReal(l, 0, theta, phi);
    } else if (m > 0) {
        return Math.sqrt(2) * sphericalHarmonicReal(l, m, theta, phi) * Math.cos(m * theta);
    } else {
        return Math.sqrt(2) * sphericalHarmonicReal(l, -m, theta, phi) * Math.sin(-m * theta);
    }
}

// Real spherical harmonic implementation
function sphericalHarmonicReal(l, m, theta, phi) {
    // Normalization constant
    let norm = Math.sqrt((2 * l + 1) / (4 * Math.PI));
    if (m !== 0) {
        let factorial_lm = factorial(l - Math.abs(m));
        let factorial_lpm = factorial(l + Math.abs(m));
        norm *= Math.sqrt(factorial_lm / factorial_lpm);
    }

    // Associated Legendre polynomial
    let cosPhiValue = Math.cos(phi);
    let legendreValue = associatedLegendre(l, Math.abs(m), cosPhiValue);

    return norm * legendreValue;
}

// Factorial function (with memoization for efficiency)
let factorialCache = {};
function factorial(n) {
    if (n in factorialCache) return factorialCache[n];
    if (n === 0 || n === 1) return factorialCache[n] = 1;
    return factorialCache[n] = n * factorial(n - 1);
}

// Specific spherical harmonics for common cases
function Y00(theta, phi) {
    return 1 / (2 * Math.sqrt(Math.PI));
}

function Y10(theta, phi) {
    return Math.sqrt(3 / (4 * Math.PI)) * Math.cos(phi);
}

function Y11(theta, phi) {
    return -Math.sqrt(3 / (8 * Math.PI)) * Math.sin(phi) * Math.cos(theta);
}

function Y20(theta, phi) {
    return Math.sqrt(5 / (16 * Math.PI)) * (3 * Math.cos(phi) * Math.cos(phi) - 1);
}

function Y21(theta, phi) {
    return -Math.sqrt(15 / (8 * Math.PI)) * Math.sin(phi) * Math.cos(phi) * Math.cos(theta);
}

function Y22(theta, phi) {
    return Math.sqrt(15 / (32 * Math.PI)) * Math.sin(phi) * Math.sin(phi) * Math.cos(2 * theta);
}

// Complex spherical harmonics (for reference)
function sphericalHarmonicComplex(l, m, theta, phi) {
    // Normalization
    let norm = Math.sqrt((2 * l + 1) / (4 * Math.PI));
    if (m !== 0) {
        let factorial_lm = factorial(l - Math.abs(m));
        let factorial_lpm = factorial(l + Math.abs(m));
        norm *= Math.sqrt(factorial_lm / factorial_lpm);
    }

    // Associated Legendre polynomial
    let cosPhiValue = Math.cos(phi);
    let legendreValue = associatedLegendre(l, Math.abs(m), cosPhiValue);

    // Phase factor (real part for real spherical harmonics)
    let phase = Math.cos(m * theta);
    if (m < 0) {
        phase = Math.pow(-1, m) * Math.cos(-m * theta);
    }

    return norm * legendreValue * phase;
}

// Generate spherical harmonic coefficients for visualization
function generateSphericalHarmonicField(l, m, resolution = 50) {
    let field = [];

    for (let i = 0; i <= resolution; i++) {
        let phi = Math.PI * i / resolution;
        let row = [];

        for (let j = 0; j <= resolution; j++) {
            let theta = 2 * Math.PI * j / resolution;
            let value = sphericalHarmonic(l, m, theta, phi);
            row.push(value);
        }
        field.push(row);
    }

    return field;
}

// Get maximum absolute value for normalization
function getSphericalHarmonicRange(l, m, resolution = 100) {
    let maxVal = 0;
    let minVal = 0;

    for (let i = 0; i <= resolution; i++) {
        let phi = Math.PI * i / resolution;
        for (let j = 0; j <= resolution; j++) {
            let theta = 2 * Math.PI * j / resolution;
            let value = sphericalHarmonic(l, m, theta, phi);
            maxVal = Math.max(maxVal, value);
            minVal = Math.min(minVal, value);
        }
    }

    return { min: minVal, max: maxVal };
}

// Evaluate spherical harmonic at a point
function evaluateSphericalHarmonic(l, m, theta, phi) {
    return sphericalHarmonic(l, m, theta, phi);
}

// List of available harmonics (for UI)
const availableHarmonics = [
    { l: 0, m: 0, name: "Y₀⁰" },
    { l: 1, m: 0, name: "Y₁⁰" },
    { l: 1, m: 1, name: "Y₁¹" },
    { l: 2, m: 0, name: "Y₂⁰" },
    { l: 2, m: 1, name: "Y₂¹" },
    { l: 2, m: 2, name: "Y₂²" },
    { l: 3, m: 0, name: "Y₃⁰" },
    { l: 3, m: 1, name: "Y₃¹" },
    { l: 3, m: 2, name: "Y₃²" },
    { l: 3, m: 3, name: "Y₃³" },
    { l: 4, m: 0, name: "Y₄⁰" },
    { l: 4, m: 1, name: "Y₄¹" },
    { l: 4, m: 2, name: "Y₄²" },
    { l: 4, m: 3, name: "Y₄³" },
    { l: 4, m: 4, name: "Y₄⁴" }
];