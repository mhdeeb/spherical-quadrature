import { SPHERE_RADIUS, SPHERICAL_DESIGN_TYPES, AVAILABLE_FILES, LEBEDEV_ORDERS } from './constants.js';

const sphericalDesignCache = {};
const lebedevCache = {};

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

    // Find closest available order
    let order = Object.keys(LEBEDEV_ORDERS).reduce((prev, curr) => (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev));

    // Return cached data if available
    if (lebedevCache[order]) {
        return lebedevCache[order];
    }

    try {
        let response = await fetch(`PointDistFiles/lebedev/lebedev_${order.toString().padStart(3, '0')}.txt`);

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
                    let theta = parseFloat(parts[0]) * Math.PI / 180; // Convert to radians
                    let phi = parseFloat(parts[1]) * Math.PI / 180;   // Convert to radians
                    let weight = parseFloat(parts[2]);

                    let point = new Point(phi, theta, weight);

                    points.push(point);
                }
            }
        }

        lebedevCache[order] = points;

        console.log(`Loaded Lebedev order ${order} with ${points.length} points`);
        return points;

    } catch (error) {
        console.warn(`Could not load Lebedev data for order ${order}: ${error.message}`);
        return null;
    }
}

// Product quadrature (Gauss-Legendre × Trapezoidal)
function generateProductQuadrature(N) {
    console.log(N);
    let points = [];

    let M = 2 * N + 1;

    let { x: phiPoints, w: weights } = gaussLegendrePoints(N);

    let phi = phiPoints.map(phi => 0.5 * Math.PI * phi + 0.5 * Math.PI).flatMap(phi => Array(M).fill(phi));
    let theta = Array.from({ length: N }, () => Array.from({ length: M }, (_, i) => (2 * Math.PI / (M - 1)) * i)).flat();

    for (let i = 0; i < phi.length; i++) {
        let point = new Point(phi[i], theta[i], 0);

        points.push(point);
    }

    return points;
}

// Check if a spherical design file exists
function sphericalDesignFileExists(type, targetPoints) {
    const files = AVAILABLE_FILES[type];
    if (!files) return null;

    if (type === 'HardinSloane') {
        // For HardinSloane, search through all degrees for the target point count
        for (const [degree, pointCounts] of Object.entries(files)) {
            if (pointCounts.includes(targetPoints)) {
                return { degree: parseInt(degree), points: targetPoints };
            }
        }
    } else {
        // For Womersley types, direct degree -> points mapping
        for (const [degree, points] of Object.entries(files)) {
            if (points === targetPoints) {
                return { degree: parseInt(degree), points: points };
            }
        }
    }

    return null;
}

// Get closest available spherical design
function getClosestSphericalDesign(type, desiredPoints) {
    const files = AVAILABLE_FILES[type];
    if (!files) return null;

    let closestFile = null;
    let minDiff = Infinity;

    if (type === 'HardinSloane') {
        // Search through all available point counts
        for (const [degree, pointCounts] of Object.entries(files)) {
            for (const points of pointCounts) {
                const diff = Math.abs(desiredPoints - points);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestFile = { degree: parseInt(degree), points: points };
                }
            }
        }
    } else {
        // For Womersley types, search through all degree -> points mappings
        for (const [degree, points] of Object.entries(files)) {
            const diff = Math.abs(desiredPoints - points);
            if (diff < minDiff) {
                minDiff = diff;
                closestFile = { degree: parseInt(degree), points: points };
            }
        }
    }

    return closestFile;
}

// Load spherical design data from files
async function loadSphericalDesignData(type, degree) {
    const designType = SPHERICAL_DESIGN_TYPES[type];
    if (!designType) {
        throw new Error(`Unknown spherical design type: ${type}`);
    }

    const cacheKey = `${type}_t${degree}`;

    // Check cache first
    if (sphericalDesignCache[cacheKey]) {
        return sphericalDesignCache[cacheKey];
    }

    // Prevent multiple simultaneous loads
    if (sphericalDesignLoading.has(cacheKey)) {
        // Wait for ongoing load to complete
        while (sphericalDesignLoading.has(cacheKey)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return sphericalDesignCache[cacheKey] || null;
    }

    sphericalDesignLoading.add(cacheKey);

    try {
        // Find available files for this degree
        let filename = null;
        let actualPoints = 0;

        // For HardinSloane, files have format hs{degree:03d}.{points:05d}
        // For Womersley, files have format ss{degree:03d}.{points:05d} or sf{degree:03d}.{points:05d}

        // Try to find the best matching file
        const possibleFiles = await findSphericalDesignFiles(type, degree);
        if (possibleFiles.length > 0) {
            // Use the first available file for this degree
            const fileInfo = possibleFiles[0];
            filename = fileInfo.filename;
            actualPoints = fileInfo.points;
        }

        if (!filename) {
            console.warn(`No spherical design file found for ${type} degree ${degree}`);
            sphericalDesignLoading.delete(cacheKey);
            return null;
        }

        // Load the file
        const response = await fetch(`PointDistFiles/sphdesigns/${designType.directory}/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
        }

        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line.trim());

        const points = [];
        for (let line of lines) {
            if (line.trim()) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const x = parseFloat(parts[0]) * SPHERE_RADIUS;
                    const y = parseFloat(parts[1]) * SPHERE_RADIUS;
                    const z = parseFloat(parts[2]) * SPHERE_RADIUS;

                    // Convert to spherical coordinates
                    const r = Math.sqrt(x * x + y * y + z * z);
                    const phi = Math.acos(Math.max(-1, Math.min(1, z / r)));
                    const theta = Math.atan2(y, x);

                    const point = new Point(x, y, z);
                    point.phi = phi;
                    point.theta = theta;
                    point.weight = 1.0 / lines.length; // Equal weights for spherical designs

                    points.push(point);
                }
            }
        }

        const result = {
            points: points,
            degree: degree,
            actualPoints: points.length,
            type: type
        };

        sphericalDesignCache[cacheKey] = result;
        console.log(`Loaded ${type} degree ${degree}: ${points.length} points from ${filename}`);

        sphericalDesignLoading.delete(cacheKey);
        return result;

    } catch (error) {
        console.error(`Error loading spherical design ${type} degree ${degree}:`, error);
        sphericalDesignLoading.delete(cacheKey);
        return null;
    }
}

// Find available spherical design files for a given type and degree
async function findSphericalDesignFiles(type, degree) {
    const designType = SPHERICAL_DESIGN_TYPES[type];
    const files = [];

    // Try different point counts and see which files actually exist
    // Based on the actual files in the directories
    let pointCountsToTry = [];

    if (type === 'HardinSloane') {
        // HardinSloane files - use point counts from AVAILABLE_FILES mapping
        pointCountsToTry = AVAILABLE_FILES['HardinSloane'][degree] || [];
    } else if (type === 'WomersleySym') {
        // WomersleySym files - use exact point counts from AVAILABLE_FILES mapping
        const actualPoints = AVAILABLE_FILES['WomersleySym'][degree];
        if (actualPoints) {
            pointCountsToTry = [actualPoints];
        }
    } else if (type === 'WomersleyNonSym') {
        // WomersleyNonSym files - use exact point counts from AVAILABLE_FILES mapping
        const actualPoints = AVAILABLE_FILES['WomersleyNonSym'][degree];
        if (actualPoints) {
            pointCountsToTry = [actualPoints];
        }
    }

    // Try to find actual files by testing a few likely filenames
    for (let points of pointCountsToTry) {
        if (points <= 0) continue;
        const filename = `${designType.prefix}${degree.toString().padStart(3, '0')}.${points.toString().padStart(5, '0')}`;
        files.push({ filename, points, degree });
    }

    // If no specific patterns, fall back to common point counts
    if (files.length === 0) {
        const commonPointCounts = [6, 12, 14, 20, 24, 32, 50, 72, 84, 94, 108, 120, 132, 144, 156, 180, 204, 216, 240];
        for (let points of commonPointCounts) {
            const filename = `${designType.prefix}${degree.toString().padStart(3, '0')}.${points.toString().padStart(5, '0')}`;
            files.push({ filename, points, degree });
        }
    }

    return files;
}

// Spherical design points (with choice of type)
function generateSphericalDesign(N, designType = 'HardinSloane') {
    // Find the closest available design using file mappings
    const closestDesign = getClosestSphericalDesign(designType, N);

    if (closestDesign) {
        const targetDegree = closestDesign.degree;
        const expectedPoints = closestDesign.points;

        console.log(`${designType}: desired=${N} → degree=${targetDegree} (${expectedPoints} points)`);

        // Check if we have cached data for this exact file
        const cacheKey = `${designType}_t${targetDegree}`;
        if (sphericalDesignCache[cacheKey]) {
            console.log(`✓ Using cached ${designType} design: ${sphericalDesignCache[cacheKey].points.length} points`);
            return sphericalDesignCache[cacheKey].points;
        }

        // Start loading real data asynchronously (only if file exists)
        loadSphericalDesignData(designType, targetDegree).then(data => {
            if (data && window.currentQuadMethod === 'spherical_design' && window.sphericalDesignType === designType) {
                console.log(`✓ Loaded real ${designType} design: ${data.points.length} points`);

                // Only trigger update if we got significantly different data
                const currentPointCount = window.quadraturePoints ? window.quadraturePoints.length : 0;
                const hasSignificantlyDifferentData = Math.abs(data.points.length - currentPointCount) > 1;

                if (hasSignificantlyDifferentData && window.triggerUpdate) {
                    console.log(`Triggering update for better spherical design: ${currentPointCount} -> ${data.points.length} points`);
                    window.triggerUpdate();
                }
            }
        }).catch(error => {
            console.error(`✗ Error loading ${designType} degree ${targetDegree}:`, error);
        });

        // Return approximation for immediate use with the expected point count
        return generateSphericalDesignFallback(expectedPoints);
    } else {
        console.warn(`✗ No ${designType} files available for ${N} points, using fallback`);
        return generateSphericalDesignFallback(N);
    }
}

// Fallback golden spiral distribution (approximates spherical designs)
function generateSphericalDesignFallback(N) {
    let points = [];
    let goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < N; i++) {
        let theta = 2 * Math.PI * i / goldenRatio;
        let phi = Math.acos(1 - 2 * i / N);

        let x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
        let y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
        let z = SPHERE_RADIUS * Math.cos(phi);

        let point = new Point(x, y, z);
        point.phi = phi;
        point.theta = theta;
        point.weight = 1.0 / N; // Equal weights for spherical designs

        points.push(point);
    }

    return points;
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

export { generateProductQuadrature, generateSphericalDesign, generateMonteCarloUniform, generateMonteCarloClustered, generateLebedevPoints, getClosestSphericalDesign, SPHERICAL_DESIGN_TYPES, prod_quad, gaussLegendre, trapezoidal }