// Spherical quadrature methods implementation (ES6 module version)
import * as THREE from './js/three.module.min.js';

// Sphere radius for Three.js coordinates
const SPHERE_RADIUS = 2;

// Monte Carlo - Uniform distribution on sphere
export function generateMonteCarloUniform(N) {
    let points = [];

    for (let i = 0; i < N; i++) {
        // Generate uniform random points on unit sphere
        let u1 = Math.random();
        let u2 = Math.random();

        let phi = Math.acos(2 * u1 - 1); // Polar angle
        let theta = 2 * Math.PI * u2;     // Azimuthal angle

        // Convert to Cartesian coordinates
        let x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
        let y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
        let z = SPHERE_RADIUS * Math.cos(phi);

        let point = new THREE.Vector3(x, y, z);
        // Add spherical coordinates and weight for integration
        point.phi = phi;
        point.theta = theta;
        point.weight = 1.0 / N; // Equal weight for Monte Carlo

        points.push(point);
    }

    return points;
}

// Monte Carlo - Clustered distribution (incorrect but educational)
export function generateMonteCarloClustered(N) {
    let points = [];

    for (let i = 0; i < N; i++) {
        // Generate points with clustering towards poles
        let u1 = Math.random();
        let u2 = Math.random();

        let phi = u1 * Math.PI;           // Uniform in [0, π] - causes clustering
        let theta = 2 * Math.PI * u2;     // Uniform in [0, 2π]

        // Convert to Cartesian coordinates
        let x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
        let y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
        let z = SPHERE_RADIUS * Math.cos(phi);

        let point = new THREE.Vector3(x, y, z);
        // Add spherical coordinates and weight for integration
        point.phi = phi;
        point.theta = theta;
        point.weight = Math.sin(phi) / N; // Weight includes sin(phi) factor for clustered sampling

        points.push(point);
    }

    return points;
}

// Lebedev quadrature points (loads from actual data files)
let lebedevCache = {};
let lebedevLoading = new Set();

async function loadLebedevData(N) {
    // Available Lebedev orders (based on files in PointDistFiles)
    const availableOrders = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 35, 41, 47, 53, 59, 65, 71, 77, 83, 89, 95, 101, 107, 113, 119, 125, 131];

    // Find closest available order
    let order = availableOrders.reduce((prev, curr) => {
        return (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev);
    });

    // Return cached data if available
    if (lebedevCache[order]) {
        return lebedevCache[order];
    }

    // Prevent multiple simultaneous loads of the same order
    if (lebedevLoading.has(order)) {
        // Wait for the ongoing load to complete
        while (lebedevLoading.has(order)) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return lebedevCache[order] || generateApproximateLebedevData(N);
    }

    lebedevLoading.add(order);

    try {
        let response = await fetch(`PointDistFiles/lebedev/lebedev_${order.toString().padStart(3, '0')}.txt`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let text = await response.text();
        let lines = text.trim().split('\n');

        let points = [];
        let weights = [];

        for (let line of lines) {
            if (line.trim()) {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    let theta = parseFloat(parts[0]) * Math.PI / 180; // Convert to radians
                    let phi = parseFloat(parts[1]) * Math.PI / 180;   // Convert to radians
                    let weight = parseFloat(parts[2]);

                    // Convert to Cartesian coordinates
                    let x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
                    let y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
                    let z = SPHERE_RADIUS * Math.cos(phi);

                    let point = new THREE.Vector3(x, y, z);
                    point.phi = phi;
                    point.theta = theta;
                    point.weight = weight;

                    points.push(point);
                    weights.push(weight);
                }
            }
        }

        let data = { points: points, weights: weights, order: order };
        lebedevCache[order] = data;
        lebedevLoading.delete(order);

        console.log(`Loaded Lebedev order ${order} with ${points.length} points`);
        return points; // Return points with attached weights

    } catch (error) {
        console.warn(`Could not load Lebedev data for order ${order}: ${error.message}`);
        lebedevLoading.delete(order);
        return generateApproximateLebedevData(N);
    }
}

export function generateLebedevPoints(N) {
    // Find the closest available Lebedev order using the file mapping
    const result = getClosestLebedevOrder(N);
    const order = result.order;
    const expectedPoints = result.points;

    console.log(`Lebedev: desired=${N} → order=${order} (${expectedPoints} points)`);

    // Check if the file exists before trying to load it
    if (!lebedevOrderExists(order)) {
        console.warn(`✗ Lebedev order ${order} file does not exist, using approximation`);
        return generateApproximateLebedev(expectedPoints);
    }

    // Return cached data if available
    if (lebedevCache[order]) {
        return lebedevCache[order].points;
    }

    // Start loading asynchronously (but don't wait)
    if (!lebedevLoading.has(order)) {
        loadLebedevData(order).then(data => {
            // Only update if we're still using Lebedev
            if (window.currentQuadMethod === 'lebedev' && data) {
                console.log(`✓ Loaded Lebedev order ${order}: ${data.length} points`);
                // Only trigger update if we got significantly different data
                const currentPointCount = window.quadraturePoints ? window.quadraturePoints.length : 0;
                const hasSignificantlyDifferentData = Math.abs(data.length - currentPointCount) > 1;

                if (hasSignificantlyDifferentData && window.triggerUpdate) {
                    console.log(`Triggering update for Lebedev: ${currentPointCount} -> ${data.length} points`);
                    window.triggerUpdate();
                }
            }
        }).catch(error => {
            console.error(`✗ Error loading Lebedev order ${order}:`, error);
        });
    }

    // Return approximation for immediate use
    return generateApproximateLebedev(expectedPoints);
}

function generateApproximateLebedev(N) {
    // Fallback approximation when data files aren't available
    let points = [];

    // Generate octahedral symmetry points
    let numLayers = Math.ceil(Math.sqrt(N / 6));
    let pointsGenerated = 0;

    for (let i = 0; i < numLayers && pointsGenerated < N; i++) {
        let z = Math.cos(Math.PI * (i + 0.5) / numLayers);
        let radius = Math.sqrt(1 - z * z);
        let numPointsInLayer = Math.max(1, Math.floor(8 * radius));

        for (let j = 0; j < numPointsInLayer && pointsGenerated < N; j++) {
            let theta = 2 * Math.PI * j / numPointsInLayer;
            let x = radius * Math.cos(theta);
            let y = radius * Math.sin(theta);

            let point = new THREE.Vector3(
                x * SPHERE_RADIUS,
                y * SPHERE_RADIUS,
                z * SPHERE_RADIUS
            );
            point.phi = Math.acos(Math.max(-1, Math.min(1, z)));
            point.theta = theta;
            point.weight = 1.0 / N; // Equal weights for approximation

            points.push(point);
            pointsGenerated++;
        }
    }

    return points;
}

function generateApproximateLebedevData(N) {
    // Return data structure similar to loaded data
    let points = generateApproximateLebedev(N);
    return {
        points: points,
        weights: new Array(points.length).fill(1.0 / points.length),
        order: N
    };
}

// Product quadrature (Gauss-Legendre × Trapezoidal)
export function generateProductQuadrature(N) {
    let points = [];

    let Nphi = Math.ceil(Math.sqrt(N / 2));
    let Ntheta = Math.ceil(N / Nphi);

    // Gauss-Legendre points for phi (polar angle)
    let phiPoints = gaussLegendrePoints(Nphi, 0, Math.PI);

    // Uniform points for theta (azimuthal angle)
    let thetaPoints = [];
    for (let j = 0; j < Ntheta; j++) {
        thetaPoints.push(2 * Math.PI * j / Ntheta);
    }

    for (let phi of phiPoints) {
        for (let theta of thetaPoints) {
            let x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
            let y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
            let z = SPHERE_RADIUS * Math.cos(phi);

            let point = new THREE.Vector3(x, y, z);
            point.phi = phi;
            point.theta = theta;
            // Product quadrature weight includes sin(phi) and proper normalization
            point.weight = Math.sin(phi) * (Math.PI / Nphi) * (2 * Math.PI / Ntheta) / (4 * Math.PI);

            points.push(point);
        }
    }

    return points;
}

// Cache for spherical design data
const sphericalDesignCache = {};
const sphericalDesignLoading = new Set();

// Exact file mappings extracted from actual PointDistFiles directories
const AVAILABLE_FILES = {
    'HardinSloane': {
        // Format: degree -> [available point counts]
        0: [1],
        1: [2, 3, 5],
        2: [4, 7, 9],
        3: [6, 8, 10, 11, 13, 15, 24],
        4: [14, 17, 19, 21],
        5: [12, 16, 18, 20, 22, 23, 25, 27, 60],
        6: [26, 28, 29, 31, 33, 35],
        7: [24, 30, 32, 34, 37, 38, 39, 41, 43],
        8: [36, 40, 42, 44, 45, 46, 47, 49, 51, 53],
        9: [48, 50, 52, 54, 55, 56, 57, 58, 59, 60, 61, 63],
        10: [60, 62, 64, 65, 66, 67, 68, 69, 71, 73],
        11: [70, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 85],
        12: [84, 86, 87, 88, 89, 90, 91, 92, 93, 95, 97, 99],
        13: [94, 96, 98, 100],
        14: [108],
        15: [120, 132],
        16: [144],
        17: [156],
        18: [180],
        19: [204],
        20: [216],
        21: [240]
    },
    'WomersleySym': {
        // Symmetric designs - point counts extracted from actual filenames
        1: 2, 3: 6, 5: 12, 7: 32, 9: 48, 11: 70, 13: 94, 15: 120, 17: 156, 19: 192,
        21: 234, 23: 278, 25: 328, 27: 380, 29: 438, 31: 498, 33: 564, 35: 632,
        37: 706, 39: 782, 41: 864, 43: 948, 45: 1038, 47: 1130, 49: 1228, 51: 1328,
        53: 1434, 55: 1542, 57: 1656, 59: 1772, 61: 1894, 63: 2018, 65: 2148,
        67: 2280, 69: 2418, 71: 2558, 73: 2704, 75: 2852, 77: 3006, 79: 3162,
        81: 3324, 83: 3488, 85: 3658, 87: 3830, 89: 4008, 91: 4188, 93: 4374,
        95: 4562, 97: 4756, 99: 4952, 101: 5154, 103: 5358, 105: 5568, 107: 5780,
        109: 5998, 111: 6218, 113: 6444, 115: 6672, 117: 6906, 119: 7142, 121: 7384,
        123: 7628, 125: 7878, 127: 8130, 129: 8388, 131: 8648, 133: 8914, 135: 9182,
        137: 9456, 139: 9732, 141: 10014, 143: 10298, 145: 10588, 147: 10880, 149: 11178,
        151: 11478, 153: 11784, 155: 12092, 157: 12406, 159: 12722, 161: 13044, 163: 13368,
        165: 13698, 167: 14030, 169: 14368, 171: 14708, 173: 15054, 175: 15402, 177: 15756,
        179: 16112, 181: 16474, 183: 16838, 185: 17208, 187: 17580, 189: 17958, 191: 18338,
        193: 18724, 195: 19112, 197: 19506, 199: 19902, 201: 20304, 203: 20708, 205: 21118,
        207: 21530, 209: 21948, 211: 22368, 213: 22794, 215: 23222, 217: 23656, 219: 24092,
        221: 24534, 223: 24978, 225: 25428, 227: 25880, 229: 26338, 231: 26798, 233: 27264,
        235: 27732, 237: 28206, 239: 28682, 241: 29164, 243: 29648, 245: 30138, 247: 30630,
        249: 31128, 251: 31628, 253: 32134, 255: 32642, 257: 33156, 259: 33672, 261: 34194,
        263: 34718, 265: 35248, 267: 35780, 269: 36318, 271: 36858, 273: 37404, 275: 37952,
        277: 38506, 279: 39062, 281: 39624, 283: 40188, 285: 40758, 287: 41330, 289: 41908,
        291: 42488, 293: 43074, 295: 43662, 297: 44256, 299: 44852, 301: 45454, 303: 46058,
        305: 46668, 307: 47280, 309: 47898, 311: 48518, 313: 49144, 315: 49772, 317: 50406,
        319: 51042, 321: 51684, 323: 52328, 325: 52978
    },
    'WomersleyNonSym': {
        // Non-symmetric designs for all degrees 1-180
        // Format: degree -> point_count (extracted from filenames)
        1: 3, 2: 6, 3: 8, 4: 14, 5: 18, 6: 26, 7: 32, 8: 42, 9: 50, 10: 62,
        11: 72, 12: 86, 13: 98, 14: 114, 15: 128, 16: 146, 17: 163, 18: 182, 19: 201, 20: 222,
        21: 243, 22: 266, 23: 289, 24: 314, 25: 339, 26: 366, 27: 393, 28: 422, 29: 451, 30: 482,
        31: 513, 32: 546, 33: 579, 34: 614, 35: 649, 36: 686, 37: 723, 38: 762, 39: 801, 40: 842,
        41: 883, 42: 926, 43: 969, 44: 1014, 45: 1059, 46: 1106, 47: 1153, 48: 1202, 49: 1251, 50: 1302,
        51: 1353, 52: 1406, 53: 1459, 54: 1514, 55: 1569, 56: 1626, 57: 1683, 58: 1742, 59: 1801, 60: 1862,
        61: 1923, 62: 1986, 63: 2049, 64: 2114, 65: 2179, 66: 2246, 67: 2313, 68: 2382, 69: 2451, 70: 2522,
        71: 2593, 72: 2666, 73: 2739, 74: 2814, 75: 2889, 76: 2966, 77: 3043, 78: 3122, 79: 3201, 80: 3282,
        81: 3363, 82: 3446, 83: 3529, 84: 3614, 85: 3699, 86: 3786, 87: 3873, 88: 3962, 89: 4051, 90: 4142,
        91: 4233, 92: 4326, 93: 4419, 94: 4514, 95: 4609, 96: 4706, 97: 4803, 98: 4902, 99: 5001, 100: 5102,
        101: 5203, 102: 5306, 103: 5409, 104: 5514, 105: 5619, 106: 5726, 107: 5833, 108: 5942, 109: 6051, 110: 6162,
        111: 6273, 112: 6386, 113: 6499, 114: 6614, 115: 6729, 116: 6846, 117: 6963, 118: 7082, 119: 7201, 120: 7322,
        121: 7443, 122: 7566, 123: 7689, 124: 7814, 125: 7939, 126: 8066, 127: 8193, 128: 8322, 129: 8451, 130: 8582,
        131: 8713, 132: 8846, 133: 8979, 134: 9114, 135: 9249, 136: 9386, 137: 9523, 138: 9662, 139: 9801, 140: 9942,
        141: 10083, 142: 10226, 143: 10369, 144: 10514, 145: 10659, 146: 10806, 147: 10953, 148: 11102, 149: 11251, 150: 11402,
        151: 11553, 152: 11706, 153: 11859, 154: 12014, 155: 12169, 156: 12326, 157: 12483, 158: 12642, 159: 12801, 160: 12962,
        161: 13123, 162: 13286, 163: 13449, 164: 13614, 165: 13779, 166: 13946, 167: 14113, 168: 14282, 169: 14451, 170: 14622,
        171: 14793, 172: 14966, 173: 15139, 174: 15314, 175: 15489, 176: 15666, 177: 15843, 178: 16022, 179: 16201, 180: 16382
    }
};

// Lebedev order to point count mapping
const LEBEDEV_ORDERS = {
    3: 6, 5: 14, 7: 26, 9: 38, 11: 50, 13: 74, 15: 86, 17: 110, 19: 146, 21: 170,
    23: 194, 25: 230, 27: 266, 29: 302, 31: 350, 35: 434, 41: 590, 47: 770,
    53: 974, 59: 1202, 65: 1454, 71: 1730, 77: 2030, 83: 2354, 89: 2702,
    95: 3074, 101: 3470, 107: 3890, 113: 4334, 119: 4802, 125: 5294, 131: 5810
};

// Available spherical design types and their file patterns
const SPHERICAL_DESIGN_TYPES = {
    'HardinSloane': {
        prefix: 'hs',
        directory: 'HardinSloane',
        minT: 0,
        maxT: 21,
        description: 'Hardin & Sloane designs (up to t=21)'
    },
    'WomersleySym': {
        prefix: 'ss',
        directory: 'WomersleySym',
        minT: 1,
        maxT: 325,
        description: 'Womersley Symmetrical (exact for odd harmonics, up to t=325)'
    },
    'WomersleyNonSym': {
        prefix: 'sf',
        directory: 'WomersleyNonSym',
        minT: 1,
        maxT: 180,
        description: 'Womersley Non-symmetrical (up to t=180)'
    }
};

// Check if a Lebedev order exists
function lebedevOrderExists(order) {
    return order in LEBEDEV_ORDERS;
}

// Get closest available Lebedev order
function getClosestLebedevOrder(desiredPoints) {
    const availableOrders = Object.keys(LEBEDEV_ORDERS).map(Number);
    const availablePoints = availableOrders.map(order => LEBEDEV_ORDERS[order]);

    // Find closest point count
    let closest = availablePoints[0];
    let closestOrder = availableOrders[0];
    let minDiff = Math.abs(desiredPoints - closest);

    for (let i = 0; i < availablePoints.length; i++) {
        const diff = Math.abs(desiredPoints - availablePoints[i]);
        if (diff < minDiff) {
            minDiff = diff;
            closest = availablePoints[i];
            closestOrder = availableOrders[i];
        }
    }

    return { order: closestOrder, points: closest };
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

                    const point = new THREE.Vector3(x, y, z);
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
export function generateSphericalDesign(N, designType = 'HardinSloane') {
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

        let point = new THREE.Vector3(x, y, z);
        point.phi = phi;
        point.theta = theta;
        point.weight = 1.0 / N; // Equal weights for spherical designs

        points.push(point);
    }

    return points;
}

// Export the available design types for UI
export { SPHERICAL_DESIGN_TYPES };

// Export utility functions for global access
export { getClosestLebedevOrder, getClosestSphericalDesign, sphericalDesignFileExists, lebedevOrderExists };

// Simplified Gauss-Legendre quadrature points
function gaussLegendrePoints(n, a, b) {
    // This is a simplified implementation
    // For production code, you'd use a proper Gauss-Legendre implementation
    let points = [];

    for (let i = 0; i < n; i++) {
        let x = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));

        // Newton-Raphson iteration to find roots of Legendre polynomial
        let x1, pp;
        do {
            let p1 = 1, p2 = 0;
            for (let j = 1; j <= n; j++) {
                let p3 = p2;
                p2 = p1;
                p1 = ((2 * j - 1) * x * p2 - (j - 1) * p3) / j;
            }
            pp = n * (x * p1 - p2) / (x * x - 1);
            x1 = x;
            x = x1 - p1 / pp;
        } while (Math.abs(x - x1) > 1e-14);

        // Transform from [-1,1] to [a,b]
        points.push((b - a) * (x + 1) / 2 + a);
    }

    return points;
}