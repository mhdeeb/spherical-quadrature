import { SPHERE_RADIUS, AVAILABLE_POINTS } from './constants.ts';
import type { CacheItem, BoundingBox3D, NumericRange } from './cache-types.ts';

type PointsCacheItem = CacheItem<Point[]>;

const pointCache: { [key: string]: { [key: number]: PointsCacheItem } } = {
    "lebedev": {},
    "HardinSloane": {},
    "WomersleySym": {},
    "WomersleyNonSym": {}
};

class Point {
    x: number;
    y: number;
    z: number;
    phi: number;
    theta: number;
    weight: number;

    constructor(phi: number, theta: number, weight: number) {
        this.phi = phi;
        this.theta = theta;
        this.weight = weight;

        this.x = SPHERE_RADIUS * Math.sin(this.phi) * Math.cos(this.theta);
        this.y = SPHERE_RADIUS * Math.sin(this.phi) * Math.sin(this.theta);
        this.z = SPHERE_RADIUS * Math.cos(this.phi);
    }
}

function generateMonteCarloUniform(N: number) {
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

function generateMonteCarloClustered(N: number) {
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

async function generateLebedevPoints(N: number, byOrder: boolean = false): Promise<PointsCacheItem | null> {
    try {
        let num: number;
        let response: Response;

        if (byOrder) {
            num = Number(Object.values(AVAILABLE_POINTS["lebedev"]).reduce((prev: number, curr: number) => (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev)));
            if (pointCache["lebedev"][num])
                return pointCache["lebedev"][num];

            response = await fetch(`PointDistFiles/lebedev/lebedev_${num.toString().padStart(3, '0')}`);
        } else {
            num = Number(Object.keys(AVAILABLE_POINTS["lebedev"]).reduce((prev: string, curr: string) => (Math.abs(Number(curr) - N) < Math.abs(Number(prev) - N) ? curr : prev)));
            for (let key of Object.keys(pointCache["lebedev"])) {
                const cached = pointCache["lebedev"][Number(key)];
                if (cached && cached.data.length == num)
                    return cached;
            }

            response = await fetch(`PointDistFiles/lebedev/lebedev_${AVAILABLE_POINTS["lebedev"][num].toString().padStart(3, '0')}`);
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let text = await response.text();
        let lines = text.trim().split('\n');

        let points: Point[] = [];
        // Prepare bounding box and weight range trackers
        let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;
        let minW = Number.POSITIVE_INFINITY, maxW = Number.NEGATIVE_INFINITY;

        for (let line of lines) {
            if (line.trim()) {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    let theta = parseFloat(parts[0]) * Math.PI / 180;
                    let phi = parseFloat(parts[1]) * Math.PI / 180;
                    let weight = parseFloat(parts[2]);

                    let point = new Point(phi, theta, weight);

                    // Update trackers
                    if (point.x < minX) minX = point.x; if (point.x > maxX) maxX = point.x;
                    if (point.y < minY) minY = point.y; if (point.y > maxY) maxY = point.y;
                    if (point.z < minZ) minZ = point.z; if (point.z > maxZ) maxZ = point.z;
                    if (weight < minW) minW = weight; if (weight > maxW) maxW = weight;

                    points.push(point);
                }
            }
        }

        const boundingBox: BoundingBox3D = { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
        const weightRange: NumericRange = { min: minW, max: maxW };
        const item: PointsCacheItem = {
            data: points,
            boundingBox,
            weightRange,
            id: byOrder ? num : AVAILABLE_POINTS["lebedev"][num],
            kind: 'lebedev',
            meta: { byOrder }
        };

        if (byOrder) {
            pointCache["lebedev"][num] = item;
        } else {
            pointCache["lebedev"][AVAILABLE_POINTS["lebedev"][num]] = item;
        }

        return item;

    } catch (error: any) {
        console.warn(`Could not load Lebedev data for N = ${N}: ${error.message}`);
        return null;
    }
}

function gaussLegendrePoints(degree: number) {
    if (degree <= 0) {
        throw new Error("Degree must be a positive integer.");
    }

    const points = new Array(degree);
    const weights = new Array(degree);
    const epsilon = 1e-15;

    for (let i = 0; i < degree; i++) {
        let x = Math.cos(Math.PI * (i + 0.75) / (degree + 0.5));
        let dp;

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

const gaussLegendre = (fn: (x: number, ...args: any[]) => number, a: number, b: number, n: number, ...args: any[]) => {
    let { x: x_sample, w: weights } = gaussLegendrePoints(n);

    x_sample = x_sample.map(x => (b - a) * x / 2 + (a + b) / 2);

    let I = 0;

    for (let i = 0; i < x_sample.length; i++)
        I += weights[i] * fn(x_sample[i], ...args);

    I = (b - a) / 2 * I;

    return I;
}

function trapezoidal(fn: (x: number, ...args: any[]) => number, a: number, b: number, n: number, ...args: any[]) {
    let h = (b - a) / n;
    let s = fn(a, ...args) + fn(b, ...args);
    for (let i = 1; i < n; i++)
        s += 2 * fn(a + i * h, ...args);
    return (h / 2) * s;
}

function prod_quad(func: (phi: number, theta: number, ...args: any[]) => number, N = 20, M = 40, ...args: any[]) {
    let I = trapezoidal(
        (theta: number) => gaussLegendre((phi: number, ...innerArgs: any[]) => func(phi, theta, ...innerArgs) * Math.sin(phi), 0, Math.PI, N, ...args),
        0,
        2 * Math.PI,
        M,
    );

    return I / (4 * Math.PI);
}

function generateProductQuadrature(N: number) {
    let points: Point[] = [];

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

async function generateSphericalDesign(
    N: number,
    designType: 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym' = 'HardinSloane',
    selectBy: 'points' | 'degree' = 'points'
): Promise<PointsCacheItem | null> {
    const designMap = AVAILABLE_POINTS[designType] as Record<number, number>; // degree -> points
    const degreeKeys = Object.keys(designMap).map(k => Number(k));

    // Choose degree either by proximity in degree or by proximity in number of points
    let chosenDegree: number;
    if (selectBy === 'degree') {
        chosenDegree = degreeKeys.reduce((prev: number, curr: number) => (Math.abs(curr - N) < Math.abs(prev - N) ? curr : prev));
    } else {
        chosenDegree = degreeKeys.reduce((prev: number, curr: number) => (Math.abs(designMap[curr] - N) < Math.abs(designMap[prev] - N) ? curr : prev));
    }

    if (pointCache[designType][chosenDegree]) {
        return pointCache[designType][chosenDegree];
    }

    try {
        const fileName = {
            HardinSloane: "hs",
            WomersleySym: "ss",
            WomersleyNonSym: "sf"
        } as const;
        let response = await fetch(`PointDistFiles/sphdesigns/${designType}/${fileName[designType] + designMap[chosenDegree].toString().padStart(3, '0')}.${chosenDegree.toString().padStart(5, '0')}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let text = await response.text();
        let lines = text.trim().split('\n');

        let points: Point[] = [];
        // Bounding box; weight is constant for spherical designs
        let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;

        for (let line of lines) {
            if (line.trim()) {
                let parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    let x = parseFloat(parts[0]);
                    let y = parseFloat(parts[1]);
                    let z = parseFloat(parts[2]);

                    let phi = Math.acos(z);
                    let theta = Math.atan2(y, x);

                    const w = 1.0 / lines.length;
                    let point = new Point(phi, theta, w);

                    // Update bounding box using parsed coordinates (or point.x/y/z, identical within precision)
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

                    points.push(point);
                }
            }
        }

        const boundingBox: BoundingBox3D = { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
        const constantWeight = points.length > 0 ? points[0].weight : 0;
        const weightRange: NumericRange = { min: constantWeight, max: constantWeight };

        const item: PointsCacheItem = {
            data: points,
            boundingBox,
            weightRange,
            id: chosenDegree,
            kind: designType,
            meta: { selectBy }
        };

        pointCache[designType][chosenDegree] = item;

        return item;

    } catch (error: any) {
        console.warn(`Could not load ${designType} data for degree = ${chosenDegree}: ${error.message}`);
        return null;
    }
}

export { generateProductQuadrature, generateSphericalDesign, generateMonteCarloUniform, generateMonteCarloClustered, generateLebedevPoints }
