import { SPHERE_RADIUS, AVAILABLE_POINTS } from './constants.js';

const pointCache = {
    "lebedev": {},
    "HardinSloane": {},
    "WomersleySym": {},
    "WomersleyNonSym": {}
};

class Point {
    x = null;
    y = null;
    z = null;
    phi = null;
    theta = null;
    weight = null;

    constructor(phi, theta, weight) {
        this.phi = phi;
        this.theta = theta;
        this.weight = weight;

        this.calculateCartesian();
    }

    calculateCartesian(r = SPHERE_RADIUS) {
        this.x = r * Math.sin(this.phi) * Math.cos(this.theta);
        this.y = r * Math.sin(this.phi) * Math.sin(this.theta);
        this.z = r * Math.cos(this.phi);
    }
}

function gaussLegendrePoints(degree) {
    if (degree <= 0) {
        throw new Error("Degree must be a positive integer.");
    }

    const points = new Array(degree);
    const weights = new Array(degree);
    const epsilon = 1e-15;

    for (let i = 0; i < degree; i++) {
        let x = Math.cos(Math.PI * (i + 0.75) / (degree + 0.5));
        let p, dp;

        while (true) {
            let p1 = 1;
            let p2 = 0;
            for (let j = 0; j < degree; j++) {
                const p3 = p2;
                p2 = p1;
                p1 = ((2 * j + 1) * x * p2 - j * p3) / (j + 1);
            }

            dp = degree * (x * p1 - p2) / (x * x - 1);
            const dx = p1 / dp;
            x -= dx;

            if (Math.abs(dx) < epsilon) {
                break;
            }
        }

        points[i] = x;
        weights[i] = 2 / ((1 - x * x) * dp * dp);
    }

    // The points are generated in descending order, so we reverse them
    // to have them in ascending order.
    const mid = Math.floor(degree / 2);
    for (let i = 0; i < mid; i++) {
        const swapPoint = points[i];
        points[i] = points[degree - 1 - i];
        points[degree - 1 - i] = swapPoint;

        const swapWeight = weights[i];
        weights[i] = weights[degree - 1 - i];
        weights[degree - 1 - i] = swapWeight;
    }


    return {
        x: points,
        w: weights
    };
}

const gaussLegendre = (fn, a, b, n, ...args) => {
    let { x: x_sample, w: weights } = gaussLegendrePoints(n);

    x_sample = x_sample.map(x => (b - a) * x / 2 + (a + b) / 2);

    let I = 0;

    for (let i = 0; i < x_sample.length; i++)
        I += weights[i] * fn(x_sample[i], ...args);

    I = (b - a) / 2 * I;

    return I;
}

function trapezoidal(fn, a, b, n, ...args) {
    let h = (b - a) / n;
    let s = fn(a, ...args) + fn(b, ...args);
    for (let i = 1; i < n; i++)
        s += 2 * fn(a + i * h, ...args);
    return (h / 2) * s;
}

function prod_quad(func, N = 20, M = 40, ...args) {
    let I = trapezoidal(
        theta => gaussLegendre((phi, ...args) => func(phi, ...args) * Math.sin(phi), 0, Math.PI, N, theta, ...args),
        0,
        2 * Math.PI,
        M,
    );

    return I / (4 * Math.PI);
}

// Monte Carlo - Uniform distribution on sphere
function generateMonteCarloUniform(N) {
    let points = [];

    for (let i = 0; i < N; i++) {
        // Generate uniform random points on unit sphere
        let u1 = Math.random();
        let u2 = Math.random();

        let phi = Math.acos(2 * u1 - 1); // Polar angle
        let theta = 2 * Math.PI * u2;     // Azimuthal angle

        let point = new Point(phi, theta, 1.0 / N);


        points.push(point);
    }

    return points;
}

// Monte Carlo - Clustered distribution (incorrect but educational)
function generateMonteCarloClustered(N) {
    let points = [];

    for (let i = 0; i < N; i++) {
        // Generate points with clustering towards poles
        let u1 = Math.random();
        let u2 = Math.random();

        let phi = u1 * Math.PI;           // Uniform in [0, π] - causes clustering
        let theta = 2 * Math.PI * u2;     // Uniform in [0, 2π]

        let point = new Point(phi, theta, Math.sin(phi) / N);


        points.push(point);
    }

    return points;
}

async function generateLebedevPoints(N) {
    let pointSize = Object.keys(AVAILABLE_POINTS["lebedev"]).reduce((prev, curr) => (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev));

    if (pointCache["lebedev"][pointSize]) {
        return pointCache["lebedev"][pointSize];
    }

    try {
        let response = await fetch(`PointDistFiles/lebedev/lebedev_${AVAILABLE_POINTS["lebedev"][pointSize].toString().padStart(3, '0')}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let text = await response.text();
        let lines = text.trim().split('\n');

        let points = [];

        for (let line of lines) {
            if (line.trim()) {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    let theta = parseFloat(parts[0]) * Math.PI / 180;
                    let phi = parseFloat(parts[1]) * Math.PI / 180;
                    let weight = parseFloat(parts[2]);

                    let point = new Point(phi, theta, weight);

                    points.push(point);
                }
            }
        }

        pointCache["lebedev"][pointSize] = points;

        return points;

    } catch (error) {
        console.warn(`Could not load Lebedev data for N = ${pointSize}: ${error.message}`);
        return null;
    }
}

// Product quadrature (Gauss-Legendre × Trapezoidal)
function generateProductQuadrature(N) {
    let points = [];

    N = Math.round(Math.sqrt(N / 2));

    let M = 2 * N + 1;

    let { x: phiPoints, w: weights } = gaussLegendrePoints(N);

    let phi = phiPoints.map(phi => 0.5 * Math.PI * phi + 0.5 * Math.PI).flatMap(phi => Array(M).fill(phi));
    let theta = Array.from({ length: N }, () => Array.from({ length: M }, (_, i) => (2 * Math.PI / (M - 1)) * i)).flat();

    for (let i = 0; i < phi.length; i++) {
        let point = new Point(phi[i], theta[i], weights[i]);

        points.push(point);
    }

    return points;
}

async function generateSphericalDesign(N, designType = 'HardinSloane') {
    let pointSize = Object.keys(AVAILABLE_POINTS[designType]).reduce((prev, curr) => (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev));

    if (pointCache[designType][pointSize]) {
        return pointCache[designType][pointSize];
    }

    try {
        const fileName = {
            "HardinSloane": "hs",
            "WomersleySym": "ss",
            "WomersleyNonSym": "sf"
        };
        let response = await fetch(`PointDistFiles/sphdesigns/${designType}/${fileName[designType] + AVAILABLE_POINTS[designType][pointSize].toString().padStart(3, '0')}.${pointSize.toString().padStart(5, '0')}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let text = await response.text();
        let lines = text.trim().split('\n');

        let points = [];

        for (let line of lines) {
            if (line.trim()) {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    let x = parseFloat(parts[0]);
                    let y = parseFloat(parts[1]);
                    let z = parseFloat(parts[2]);

                    let phi = Math.acos(z);
                    let theta = Math.atan2(y, x);

                    let point = new Point(phi, theta, 1.0 / points.length);

                    points.push(point);
                }
            }
        }

        pointCache[designType][pointSize] = points;

        console.log(`Loaded ${designType} with ${points.length} points`);
        return points;

    } catch (error) {
        console.warn(`Could not load ${designType} data for N = ${pointSize}: ${error.message}`);
        return null;
    }
}

export { generateProductQuadrature, generateSphericalDesign, generateMonteCarloUniform, generateMonteCarloClustered, generateLebedevPoints, prod_quad, gaussLegendre, trapezoidal }