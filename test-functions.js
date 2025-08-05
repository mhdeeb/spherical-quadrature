// Test functions for spherical integration

// Export for ES6 modules
export { evaluateTestFunction, getAnalyticalValue, getFunctionRange };

// Coordinate conversion helpers
function sphericalToCartesian(phi, theta) {
    return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi)
    };
}

// Test Function 1: Polynomial
function testFunction1(phi, theta, a = 1) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;
    let z = coords.z;

    return 1 + x + y * y + x * x * y + Math.pow(x, 4) + Math.pow(y, 5) + x * x * y * y * z * z;
}

// Test Function 2: Gaussian peaks
function testFunction2(phi, theta, a = 1) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;
    let z = coords.z;

    let term1 = 0.75 * Math.exp(-0.25 * (
        Math.pow(9 * x - 2, 2) +
        Math.pow(9 * y - 2, 2) +
        Math.pow(9 * z - 2, 2)
    ));

    let term2 = 0.75 * Math.exp(-(
        Math.pow(9 * x + 1, 2) / 49 +
        (9 * y + 1) / 10 +
        (9 * z + 1) / 10
    ));

    let term3 = 0.5 * Math.exp(-0.25 * (
        Math.pow(9 * x - 7, 2) +
        Math.pow(9 * y - 3, 2) +
        Math.pow(9 * z - 5, 2)
    ));

    let term4 = -0.2 * Math.exp(-(
        Math.pow(9 * x - 4, 2) +
        Math.pow(9 * y - 7, 2) +
        Math.pow(9 * z - 5, 2)
    ));

    return term1 + term2 + term3 + term4;
}

// Test Function 3: Hyperbolic tangent
function testFunction3(phi, theta, a = 9) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;
    let z = coords.z;

    return (1 + Math.tanh(-a * (x + y - z))) / (1.0 * a);
}

// Test Function 4: Sign function (discontinuous)
function testFunction4(phi, theta, a = 9) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;
    let z = coords.z;

    return (1 + Math.sign(-a * (x + (y - z)))) / (1.0 * a);
}

// Test Function 5: Another sign function
function testFunction5(phi, theta, a = 9) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;

    return (1 + Math.sign(-a * (Math.PI * x + y))) / (1.0 * a);
}

// Simple harmonic function for testing
function harmonicFunction(phi, theta, l = 2, m = 1) {
    return sphericalHarmonic(l, m, theta, phi);
}

// Constant function (should integrate to 1)
function constantFunction(phi, theta, a = 1) {
    return 1;
}

// Cosine of polar angle
function cosinePolarFunction(phi, theta, a = 1) {
    return Math.cos(phi);
}

// Sine squared function
function sineSquaredFunction(phi, theta, a = 1) {
    return Math.sin(phi) * Math.sin(phi);
}

// Exponential decay function
function exponentialFunction(phi, theta, a = 1) {
    let coords = sphericalToCartesian(phi, theta);
    let x = coords.x;
    let y = coords.y;
    let z = coords.z;

    return Math.exp(-a * (x * x + y * y + z * z));
}

// Evaluate test function based on name
function evaluateTestFunction(functionName, phi, theta, a = 1) {
    switch (functionName) {
        case 'f1':
        case 'polynomial':
            return testFunction1(phi, theta, a);
        case 'f2':
        case 'gaussian':
            return testFunction2(phi, theta, a);
        case 'f3':
        case 'tanh':
            return testFunction3(phi, theta, a);
        case 'f4':
        case 'sign1':
            return testFunction4(phi, theta, a);
        case 'f5':
        case 'sign2':
            return testFunction5(phi, theta, a);
        case 'harmonic':
            return harmonicFunction(phi, theta, 2, 1);
        case 'constant':
            return constantFunction(phi, theta, a);
        case 'cosine':
            return cosinePolarFunction(phi, theta, a);
        case 'sine2':
            return sineSquaredFunction(phi, theta, a);
        case 'exp':
            return exponentialFunction(phi, theta, a);
        default:
            return constantFunction(phi, theta, a);
    }
}

// Analytical values for some test functions (normalized over sphere)
const analyticalValues = {
    'f1': 216 * Math.PI / 35 / (4 * Math.PI),
    'f2': 6.6961822200736179253 / (4 * Math.PI),
    'f3': function (a) { return Math.PI / a; },
    'f4': function (a) { return Math.PI / a; },
    'f5': function (a) { return Math.PI / a; },
    'constant': 1,
    'cosine': 0,
    'sine2': 2 / 3,
    'harmonic': 0
};

// Get analytical value for a test function
function getAnalyticalValue(functionName, a = 1) {   
    if (functionName in analyticalValues) {
        let value = analyticalValues[functionName];
        if (typeof value === 'function') {
            return value(a);
        } else {
            return value;
        }
    }
    return null; // Unknown analytical value
}

// List of available test functions for UI
const availableTestFunctions = [
    { value: 'f1', name: 'Polynomial', description: '1 + x + y² + x²y + x⁴ + y⁵ + x²y²z²' },
    { value: 'f2', name: 'Gaussian Peaks', description: 'Sum of Gaussian functions' },
    { value: 'f3', name: 'Hyperbolic Tangent', description: 'tanh(-a(x + y - z))' },
    { value: 'f4', name: 'Sign Function 1', description: 'sign(-a(x + y - z))' },
    { value: 'f5', name: 'Sign Function 2', description: 'sign(-a(πx + y))' },
    { value: 'constant', name: 'Constant', description: 'f(θ,φ) = 1' },
    { value: 'cosine', name: 'Cosine', description: 'cos(φ)' },
    { value: 'sine2', name: 'Sine Squared', description: 'sin²(φ)' },
    { value: 'harmonic', name: 'Spherical Harmonic', description: 'Y₂¹(θ,φ)' },
    { value: 'exp', name: 'Exponential', description: 'exp(-a(x² + y² + z²))' }
];

// Function to compute integration error
function computeIntegrationError(functionName, numericalValue, a = 1) {
    let analytical = getAnalyticalValue(functionName, a);
    if (analytical !== null) {
        return Math.abs(numericalValue - analytical);
    }
    return null;
}

// Function to get function value range for colormapping
function getFunctionRange(functionName, a = 1, resolution = 50) {
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i <= resolution; i++) {
        let phi = Math.PI * i / resolution;
        for (let j = 0; j <= resolution; j++) {
            let theta = 2 * Math.PI * j / resolution;
            let value = evaluateTestFunction(functionName, phi, theta, a);
            minVal = Math.min(minVal, value);
            maxVal = Math.max(maxVal, value);
        }
    }

    return { min: minVal, max: maxVal };
}