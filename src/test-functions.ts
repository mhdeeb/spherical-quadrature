function sphericalToCartesian(phi: number, theta: number) {
    return {
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi)
    };
}

function testFunction1(phi: number, theta: number, a = 1) {
    const { x, y, z } = sphericalToCartesian(phi, theta);
    return 1 + x + y * y + x * x * y + Math.pow(x, 4) + Math.pow(y, 5) + x * x * y * y * z * z;
}

function testFunction2(phi: number, theta: number, a = 1) {
    const { x, y, z } = sphericalToCartesian(phi, theta);
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

function testFunction3(phi: number, theta: number, a = 9) {
    const { x, y, z } = sphericalToCartesian(phi, theta);
    return (1 + Math.tanh(-a * (x + y - z))) / (1.0 * a);
}

function testFunction4(phi: number, theta: number, a = 9) {
    const { x, y, z } = sphericalToCartesian(phi, theta);
    return (1 + Math.sign(-a * (x + (y - z)))) / (1.0 * a);
}

function testFunction5(phi: number, theta: number, a = 9) {
    const { x, y, z } = sphericalToCartesian(phi, theta);
    return (1 + Math.sign(-a * (Math.PI * x + y))) / (1.0 * a);
}

const testFunctions = [
    { value: 'f1', name: 'Polynomial', description: '1 + x + y² + x²y + x⁴ + y⁵ + x²y²z²', function: testFunction1, analyticalValue: 216 * Math.PI / 35 / (4 * Math.PI) },
    { value: 'f2', name: 'Gaussian Peaks', description: 'Sum of Gaussian functions', function: testFunction2, analyticalValue: 6.6961822200736179253 / (4 * Math.PI) },
    { value: 'f3', name: 'Hyperbolic Tangent', description: 'tanh(-a(x + y - z))', function: testFunction3, analyticalValue: (a: number) => 4 * Math.PI / a / (4 * Math.PI) },
    { value: 'f4', name: 'Sign Function 1', description: 'sign(-a(x + y - z))', function: testFunction4, analyticalValue: (a: number) => 4 * Math.PI / a / (4 * Math.PI) },
    { value: 'f5', name: 'Sign Function 2', description: 'sign(-a(πx + y))', function: testFunction5, analyticalValue: (a: number) => 4 * Math.PI / a / (4 * Math.PI) },
];

export default testFunctions;
