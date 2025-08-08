import {
    generateLebedevPoints,
    generateSphericalDesign,
    generateMonteCarloUniform,
    generateMonteCarloClustered,
} from './sphere-quadrature-module.ts';

import testFunctions from './test-functions.ts';

import lilGui from 'lil-gui';
import { AVAILABLE_POINTS } from './constants.ts';

type SphericalDesignType = 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';
type QuadPoint = { x: number | null; y: number | null; z: number | null; weight?: number | null; phi?: number | null; theta?: number | null };

declare global {
    interface Window {
        testFunctionFolder?: any;
        efficiencyAnalysis?: any;
    }
}
import Plotly from 'plotly.js-dist-min';

const LEBEDEV_ORDERS: Record<number, number> = AVAILABLE_POINTS.lebedev as unknown as Record<number, number>;
const AVAILABLE_FILES: Record<SphericalDesignType, Record<number, number>> = {
    HardinSloane: AVAILABLE_POINTS.HardinSloane as unknown as Record<number, number>,
    WomersleySym: AVAILABLE_POINTS.WomersleySym as unknown as Record<number, number>,
    WomersleyNonSym: AVAILABLE_POINTS.WomersleyNonSym as unknown as Record<number, number>,
};

// Configuration
const config = {
    testFunction: 'f2',
    functionParam: 12,
    sphericalDesignType: 'WomersleyNonSym',
    maxPoints: 5000,
    plotType: 'loglog' // 'loglog' or 'linear'
};

// GUI instance
let gui;

// Data storage
type AnalysisSeries = { degrees: number[]; points: number[]; efficiencies: number[]; errors: number[] };
let analysisData: { lebedev: AnalysisSeries; sphericalDesign: AnalysisSeries; product: AnalysisSeries; monteCarlo: AnalysisSeries } = {
    lebedev: { degrees: [], points: [], efficiencies: [], errors: [] },
    sphericalDesign: { degrees: [], points: [], efficiencies: [], errors: [] },
    product: { degrees: [], points: [], efficiencies: [], errors: [] },
    monteCarlo: { degrees: [], points: [], efficiencies: [], errors: [] }
};

// (Descriptions intentionally omitted)

// Color scheme
const colors: Record<string, string> = {
    lebedev: '#e74c3c',
    sphericalDesign: '#2c3e50',
    product: '#3498db',
    monteCarlo1: '#27ae60',
    monteCarlo2: '#16a085'
};

// Helper function to get spherical design by degree
async function getSphericalDesignByDegree(
    designType: SphericalDesignType,
    degree: number
): Promise<QuadPoint[] | null> {
    const availableForType = AVAILABLE_FILES[designType];
    const pointCount = availableForType?.[degree];
    if (pointCount) {
        return await generateSphericalDesign(pointCount, designType) as unknown as QuadPoint[];
    }
    return null;
}

// Initialize the application
async function init() {
    console.log('🚀 Initializing Efficiency Analysis...');

    try {
        console.log('📋 Step 1: Initializing GUI...');
        initializeGUI();

        console.log('📊 Step 2: Loading analysis data...');
        await loadAnalysisData();

        console.log('📈 Step 3: Updating plots...');
        updatePlots();

        console.log('📋 Step 4: Updating stats...');
        updateStats();

        console.log('✅ Efficiency Analysis initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize:', error);
        const message = (error instanceof Error) ? error.message : String(error);
        showError('Failed to initialize efficiency analysis: ' + message);
    }
}

// Initialize GUI controls
function initializeGUI() {
    console.log('🔍 Checking GUI container...');
    const container = document.getElementById('gui-container');
    if (!container) {
        console.error('❌ GUI container not found!');
        return;
    }
    console.log('✅ GUI container found:', container);

    console.log('🔍 Checking lilGui availability...');
    if (typeof lilGui === 'undefined') {
        console.error('❌ lilGui is not available! Import failed.');
        return;
    }
    console.log('✅ lilGui available:', lilGui);

    console.log('🔨 Creating GUI instance...');
    try {
        gui = new lilGui({ container: container, width: 340 });
        gui.title('📊 Spherical Quadrature Analysis');
        console.log('✅ GUI instance created successfully');
    } catch (error) {
        console.error('❌ Failed to create GUI instance:', error);
        return;
    }



    // Analysis Settings Folder
    const analysisFolder = gui.addFolder('📊 Analysis Settings');
    analysisFolder.open();

    analysisFolder.add(config, 'maxPoints', 100, 10000, 100)
        .name('Max Points Limit')
        .onChange(async () => {
            await loadAnalysisData();
            updatePlots();
            updateStats();
        });

    // Test Function Settings Folder
    const testFunctionFolder = gui.addFolder('🔬 Test Function Settings');
    testFunctionFolder.open();

    // Build function options dynamically from testFunctions
    const toSubscript = (num: number) => {
        const sub = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return String(num).split('').map(d => sub[parseInt(d, 10)]).join('');
    };
    const testFunctionOptions: Record<string, string> = {};
    testFunctions.forEach((tf: any, idx: number) => {
        const label = `f${toSubscript(idx + 1)} - ${tf.name}`;
        testFunctionOptions[label] = tf.value;
    });

    testFunctionFolder.add(config, 'testFunction', testFunctionOptions)
        .name('Test Function')
        .onChange(async () => {
            await calculateErrorData();
            updatePlots();
            updateStats();
        });

    testFunctionFolder.add(config, 'functionParam', 1, 20, 1)
        .name('Parameter (a)')
        .onChange(async () => {
            await calculateErrorData();
            updatePlots();
            updateStats();
        });



    // Quadrature Methods folder removed (kept default config.sphericalDesignType)

    // Visualization Settings Folder
    const vizFolder = gui.addFolder('📈 Visualization');
    vizFolder.open();

    vizFolder.add(config, 'plotType', {
        'Log-Log Scale': 'loglog',
        'Linear Scale': 'linear'
    })
        .name('Plot Scale')
        .onChange(() => {
            updatePlots();
        });



    // Store references for updates
    window.testFunctionFolder = testFunctionFolder;



    console.log('✅ GUI initialized successfully');
}



// Load and calculate analysis data
async function loadAnalysisData() {
    console.log('📊 Loading analysis data...');

    // Show loading state
    showLoadingState(true);

    try {
        // Clear existing data
        analysisData = {
            lebedev: { degrees: [], points: [], efficiencies: [], errors: [] },
            sphericalDesign: { degrees: [], points: [], efficiencies: [], errors: [] },
            product: { degrees: [], points: [], efficiencies: [], errors: [] },
            monteCarlo: { degrees: [], points: [], efficiencies: [], errors: [] }
        };

        // Calculate both efficiency and error data for all methods
        await calculateEfficiencyData();
        await calculateErrorData();

        console.log('✅ Analysis data loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load analysis data:', error);
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// Calculate efficiency factors based on McLaren (1963)
async function calculateEfficiencyData() {
    console.log('📈 Calculating efficiency factors...');

    // Clear existing data
    analysisData.lebedev.degrees = [];
    analysisData.lebedev.points = [];
    analysisData.lebedev.efficiencies = [];
    analysisData.sphericalDesign.degrees = [];
    analysisData.sphericalDesign.points = [];
    analysisData.sphericalDesign.efficiencies = [];
    analysisData.product.degrees = [];
    analysisData.product.points = [];
    analysisData.product.efficiencies = [];
    analysisData.monteCarlo.degrees = [];
    analysisData.monteCarlo.points = [];
    analysisData.monteCarlo.efficiencies = [];
    analysisData.monteCarlo.errors = [];

    // Lebedev efficiency
    const lebedevOrders = Object.keys(LEBEDEV_ORDERS).map(Number).sort((a, b) => a - b);

    for (let order of lebedevOrders) {
        if (order > 131) break; // Limit for visualization

        const points = await generateLebedevPoints(order, 'order'); // Select by order

        // Skip if data couldn't be loaded (no approximations)
        if (!points || points.length === 0) {
            console.warn(`Skipping Lebedev order ${order} - data not available`);
            continue;
        }

        const actualPoints = points.length;

        if (actualPoints > config.maxPoints) break;

        // For Lebedev, Python uses the order directly as degree
        const degreeFromOrder = order;

        const efficiencyPython = Math.pow(degreeFromOrder + 1, 2) / (3.0 * actualPoints);

        // Use the Python approach (order as degree)
        const efficiency = efficiencyPython;

        // Verify we're getting the expected point count
        const expectedPoints = LEBEDEV_ORDERS[order];
        if (actualPoints !== expectedPoints) {
            console.warn(`Lebedev order ${order}: got ${actualPoints} points, expected ${expectedPoints}`);
        }

        analysisData.lebedev.degrees.push(order);
        analysisData.lebedev.points.push(actualPoints);
        analysisData.lebedev.efficiencies.push(efficiency);
    }

    // Spherical design efficiency
    const maxDegree = config.sphericalDesignType === 'HardinSloane' ? 21 :
        config.sphericalDesignType === 'WomersleySym' ? 140 : 180;

    for (let degree = 1; degree <= Math.min(maxDegree, 100); degree +=
        config.sphericalDesignType === 'WomersleySym' ? 2 : 1) {

        try {
            const availableForType = AVAILABLE_FILES[config.sphericalDesignType as SphericalDesignType];
            const actualPoints = availableForType?.[degree];
            if (!actualPoints) continue; // Skip unavailable degrees

            if (actualPoints > config.maxPoints) continue;

            const efficiency = Math.pow(degree + 1, 2) / (3.0 * actualPoints);

            analysisData.sphericalDesign.degrees.push(degree);
            analysisData.sphericalDesign.points.push(actualPoints);
            analysisData.sphericalDesign.efficiencies.push(efficiency);
        } catch (error) {
            // Skip unavailable degrees
            continue;
        }
    }

    // Gaussian product efficiency (constant at 2/3)
    for (let m = 2; m <= 74; m += 14) {
        const points1 = 2 * m * m;
        const points2 = 2 * m * (m + 1);

        if (points1 <= config.maxPoints) {
            analysisData.product.degrees.push(m);
            analysisData.product.points.push(points1);
            analysisData.product.efficiencies.push(2.0 / 3.0);
        }

        if (points2 <= config.maxPoints) {
            analysisData.product.degrees.push(m);
            analysisData.product.points.push(points2);
            analysisData.product.efficiencies.push(2.0 / 3.0);
        }
    }

    // Monte Carlo efficiency (approximate)
    const monteCarloPoints = [100, 500, 1000, 2000, 5000];
    for (let points of monteCarloPoints) {
        if (points <= config.maxPoints) {
            // Approximate degree for Monte Carlo based on point count
            const approximateDegree = Math.floor(Math.sqrt(points / 2));
            analysisData.monteCarlo.degrees.push(approximateDegree);
            analysisData.monteCarlo.points.push(points);
            // Monte Carlo efficiency is approximately 1/3 for uniform sampling
            analysisData.monteCarlo.efficiencies.push(1.0 / 3.0);
        }
    }


}

// Calculate integration errors for test functions
async function calculateErrorData() {
    console.log('🔬 Calculating integration errors...');

    // Clear existing error data
    analysisData.lebedev.errors = [];
    analysisData.sphericalDesign.errors = [];
    analysisData.product.errors = [];
    analysisData.monteCarlo.errors = [];
    // Reset x-axes for error plots to ensure alignment with errors we push below
    analysisData.lebedev.points = [];
    analysisData.sphericalDesign.points = [];
    analysisData.product.points = [];
    analysisData.monteCarlo.points = [];

    // Handle both key format (f1, f2, etc.) and display format (f₁ - Polynomial, etc.)
    let functionKey = config.testFunction;

    // If it's a display name, extract the key
    if (functionKey.includes(' - ')) {
        functionKey = functionKey.split(' - ')[0].replace('₁', '1').replace('₂', '2').replace('₃', '3').replace('₄', '4').replace('₅', '5');
    }

    const testFunctionMap: Record<string, any> = Object.fromEntries(testFunctions.map((t: any) => [t.value, t]));
    const testEntry = testFunctionMap[functionKey];
    const exactValue = getExactValue(functionKey, config.functionParam, testFunctionMap);

    if (!testEntry || exactValue === undefined) {
        throw new Error(`Invalid test function: ${config.testFunction} (parsed as: ${functionKey})`);
    }

    // Lebedev errors
    const lebedevOrders = Object.keys(LEBEDEV_ORDERS).map(Number).sort((a, b) => a - b);

    for (let order of lebedevOrders) {
        if (order > 131) break;

        try {
            const points = await generateLebedevPoints(order);

            // Skip if data couldn't be loaded (no approximations)
            if (!points || points.length === 0) {
                console.warn(`Skipping Lebedev order ${order} for error calculation - data not available`);
                continue;
            }

            const actualPoints = points.length;

            if (actualPoints > config.maxPoints) break;

            const numericalValue = computeLebedevIntegral(points, testEntry, config.functionParam);
            const error = Math.abs(exactValue - numericalValue);
            analysisData.lebedev.points.push(actualPoints);
            analysisData.lebedev.errors.push(error);
        } catch (error) {
            console.warn(`Error calculating Lebedev integration for order ${order}:`, error);
            continue;
        }
    }

    // Spherical design errors
    const maxDegree = config.sphericalDesignType === 'HardinSloane' ? 21 :
        config.sphericalDesignType === 'WomersleySym' ? 100 : 100;

    for (let degree = 1; degree <= maxDegree; degree +=
        config.sphericalDesignType === 'WomersleySym' ? 2 : 1) {

        try {
            const points = await getSphericalDesignByDegree(config.sphericalDesignType as SphericalDesignType, degree);
            if (!points) continue; // Skip unavailable degrees

            const actualPoints = points.length;

            if (actualPoints > config.maxPoints) continue;

            const numericalValue = computeSphericalDesignIntegral(points, testEntry, config.functionParam);
            const error = Math.abs(exactValue - numericalValue);
            analysisData.sphericalDesign.points.push(actualPoints);
            analysisData.sphericalDesign.errors.push(error);
        } catch (error) {
            continue;
        }
    }

    // Monte Carlo errors (multiple sample sizes)
    const mcPoints = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

    for (let numPoints of mcPoints) {
        if (numPoints > config.maxPoints) break;

        // Uniform Monte Carlo
        const uniformPoints = generateMonteCarloUniform(numPoints);
        const uniformValue = computeMonteCarloIntegral(uniformPoints, testEntry, config.functionParam, 'uniform');
        const uniformError = Math.abs(exactValue - uniformValue);
        analysisData.monteCarlo.points.push(numPoints);

        // Clustered Monte Carlo
        // Also compute clustered for reference (not plotted)
        const clusteredPoints = generateMonteCarloClustered(numPoints);
        void computeMonteCarloIntegral(clusteredPoints, testEntry, config.functionParam, 'clustered');

        // Store both errors (we'll average them or show both in plot)
        analysisData.monteCarlo.errors.push(uniformError);
        // Could also store clustered separately or average them
    }

    // Gaussian Product errors
    for (let m = 2; m <= 74; m += 14) {
        const points1 = 2 * m * m;
        const points2 = 2 * m * (m + 1);

        // Test both point configurations
        if (points1 <= config.maxPoints) {
            const productPoints1 = generateGaussianProduct(m, 2 * m);
            const productValue1 = computeGaussianProductIntegral(productPoints1, testEntry, config.functionParam);
            const productError1 = Math.abs(exactValue - productValue1);
            analysisData.product.points.push(points1);
            analysisData.product.errors.push(productError1);
        }

        if (points2 <= config.maxPoints) {
            const productPoints2 = generateGaussianProduct(m, 2 * m + 1);
            const productValue2 = computeGaussianProductIntegral(productPoints2, testEntry, config.functionParam);
            const productError2 = Math.abs(exactValue - productValue2);
            analysisData.product.points.push(points2);
            analysisData.product.errors.push(productError2);
        }
    }
}

// Get exact analytical value for test function
function getExactValue(
    functionName: string,
    param: number,
    testFunctionMap: Record<string, any>
) {
    const entry = testFunctionMap[functionName];
    if (!entry) return undefined;
    const analytical = entry.analyticalValue;
    if (typeof analytical === 'function') {
        return analytical(param) / (4 * Math.PI);
    } else if (typeof analytical === 'number') {
        return analytical / (4 * Math.PI);
    }
    return undefined;
}

// Compute Lebedev integral
function computeLebedevIntegral(points: QuadPoint[], testEntry: any, param: number) {
    let sum = 0;

    for (let point of points) {
        if (point.weight == null) continue;

        const zVal = point.z ?? 0;
        const yVal = point.y ?? 0;
        const xVal = point.x ?? 0;
        const denom = Math.sqrt(xVal * xVal + yVal * yVal + zVal * zVal) || 1;
        const phi = point.phi != null ? point.phi : Math.acos(Math.max(-1, Math.min(1, zVal / denom)));
        const theta = point.theta != null ? point.theta : Math.atan2(yVal, xVal);

        const { x, y, z } = sphericalToCartesian(phi, theta);
        const funcValue = testEntry.function(x, y, z, param);
        sum += funcValue * (point.weight ?? 0);
    }

    return sum;
}

// Compute spherical design integral
function computeSphericalDesignIntegral(points: QuadPoint[], testEntry: any, param: number) {
    let sum = 0;

    for (let point of points) {
        const zVal = point.z ?? 0;
        const yVal = point.y ?? 0;
        const xVal = point.x ?? 0;
        const denom = Math.sqrt(xVal * xVal + yVal * yVal + zVal * zVal) || 1;
        const phi = point.phi != null ? point.phi : Math.acos(Math.max(-1, Math.min(1, zVal / denom)));
        const theta = point.theta != null ? point.theta : Math.atan2(yVal, xVal);

        const { x, y, z } = sphericalToCartesian(phi, theta);
        const funcValue = testEntry.function(x, y, z, param);
        sum += funcValue;
    }

    return sum / points.length; // Average value on sphere
}

// Compute Monte Carlo integral
function computeMonteCarloIntegral(
    points: QuadPoint[],
    testEntry: any,
    param: number,
    method: 'uniform' | 'clustered'
) {
    let sum = 0;

    for (let point of points) {
        // Use phi and theta from point if available, otherwise compute
        const zVal = point.z ?? 0;
        const yVal = point.y ?? 0;
        const xVal = point.x ?? 0;
        const denom = Math.sqrt(xVal * xVal + yVal * yVal + zVal * zVal) || 1;
        const phi = point.phi != null ? point.phi : Math.acos(Math.max(-1, Math.min(1, zVal / denom)));
        const theta = point.theta != null ? point.theta : Math.atan2(yVal, xVal);

        const { x, y, z } = sphericalToCartesian(phi, theta);
        const funcValue = testEntry.function(x, y, z, param);

        if (method === 'uniform') {
            sum += funcValue;
        } else { // clustered
            // For clustered, the weight already includes sin(phi) factor
            sum += funcValue * ((point.weight ?? 0) * points.length);
        }
    }

    if (method === 'uniform') {
        return sum / points.length; // Average value on sphere
    } else {
        return sum; // Already weighted appropriately
    }
}

// Generate Gaussian Product quadrature points
// Following Python approach: Gauss-Legendre for φ, Trapezoidal for θ
function generateGaussianProduct(N: number, M: number) {
    const points: QuadPoint[] = [];

    // Gauss-Legendre nodes and weights for [0, π] (phi direction)
    const getGaussLegendreNodes = (n: number) => {
        // Simplified Gauss-Legendre nodes for [-1, 1]
        const nodes: number[] = [];
        const weights: number[] = [];

        if (n === 1) {
            nodes.push(0); weights.push(2);
        } else if (n === 2) {
            nodes.push(-1 / Math.sqrt(3), 1 / Math.sqrt(3));
            weights.push(1, 1);
        } else if (n === 3) {
            nodes.push(-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5));
            weights.push(5 / 9, 8 / 9, 5 / 9);
        } else if (n === 4) {
            const a = Math.sqrt(3 / 7 - 2 / 7 * Math.sqrt(6 / 5));
            const b = Math.sqrt(3 / 7 + 2 / 7 * Math.sqrt(6 / 5));
            nodes.push(-b, -a, a, b);
            weights.push((18 - Math.sqrt(30)) / 36, (18 + Math.sqrt(30)) / 36,
                (18 + Math.sqrt(30)) / 36, (18 - Math.sqrt(30)) / 36);
        } else {
            // Fallback to uniform for higher orders
            for (let i = 0; i < n; i++) {
                const x = -1 + 2 * (i + 0.5) / n;
                nodes.push(x);
                weights.push(2.0 / n);
            }
        }

        // Transform from [-1,1] to [0,π]
        const transformedNodes = nodes.map(x => Math.PI * (x + 1) / 2);
        const transformedWeights = weights.map(w => w * Math.PI / 2);

        return { nodes: transformedNodes, weights: transformedWeights };
    };

    // Trapezoidal nodes for [0, 2π] (theta direction)
    const getTrapezoidalNodes = (m: number) => {
        const nodes: number[] = [];
        const weights: number[] = [];
        const h = 2 * Math.PI / m;

        for (let i = 0; i < m; i++) {
            nodes.push(i * h);
            weights.push(h);
        }

        return { nodes, weights };
    };

    const gaussPhi = getGaussLegendreNodes(N);
    const trapTheta = getTrapezoidalNodes(M);

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < M; j++) {
            const phi = gaussPhi.nodes[i];    // [0, π]
            const theta = trapTheta.nodes[j]; // [0, 2π]

            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);

            // Weight includes sin(phi) factor for spherical integration
            const weight = gaussPhi.weights[i] * trapTheta.weights[j] * Math.sin(phi);

            points.push({ x, y, z, weight, phi, theta });
        }
    }

    return points;
}

// Compute Gaussian Product integral
function computeGaussianProductIntegral(points: QuadPoint[], testEntry: any, param: number) {
    let sum = 0;

    for (let point of points) {
        if (point.weight == null) continue;

        // Use phi and theta directly from point (already computed correctly)
        const phi = point.phi;
        const theta = point.theta;
        if (phi == null || theta == null) continue;

        const { x, y, z } = sphericalToCartesian(phi, theta);
        const funcValue = testEntry.function(x, y, z, param);
        sum += funcValue * (point.weight ?? 0);
    }

    return sum / (4 * Math.PI); // Normalize for sphere as per Python reference
}

// Update plots
function updatePlots() {
    // Always update both plots simultaneously
    updateEfficiencyPlot();
    updateErrorPlot();
}

// Update efficiency plot
function updateEfficiencyPlot() {
    const traces = [];

    // Clear loading state
    const efficiencyPlotDiv = document.getElementById('efficiency-plot');
    if (efficiencyPlotDiv) {
        efficiencyPlotDiv.classList.remove('loading');
    }



    // Lebedev efficiency
    if (analysisData.lebedev.degrees.length > 0) {
        traces.push({
            x: analysisData.lebedev.degrees,
            y: analysisData.lebedev.efficiencies,
            mode: 'lines+markers',
            name: 'Lebedev',
            line: { color: colors.lebedev, width: 3 },
            marker: { size: 8, symbol: 'x' }
        });
    }

    // Spherical design efficiency
    if (analysisData.sphericalDesign.degrees.length > 0) {
        traces.push({
            x: analysisData.sphericalDesign.degrees,
            y: analysisData.sphericalDesign.efficiencies,
            mode: 'lines+markers',
            name: `Spherical Design (${config.sphericalDesignType})`,
            line: { color: colors.sphericalDesign, width: 3 },
            marker: { size: 8, symbol: 'x' }
        });
    }

    // Gaussian product efficiency (constant at 2/3)
    if (analysisData.product.degrees.length > 0) {
        traces.push({
            x: analysisData.product.degrees,
            y: analysisData.product.efficiencies,
            mode: 'lines+markers',
            name: 'Gaussian Product',
            line: { color: colors.product, width: 3 },
            marker: { size: 6, symbol: 'diamond' }
        });
    }

    // Monte Carlo efficiency (approximate)
    if (analysisData.monteCarlo.degrees.length > 0) {
        traces.push({
            x: analysisData.monteCarlo.degrees,
            y: analysisData.monteCarlo.efficiencies,
            mode: 'lines+markers',
            name: 'Monte Carlo',
            line: { color: colors.monteCarlo1, width: 3 },
            marker: { size: 6, symbol: 'circle' }
        });
    }

    const layout: any = {
        xaxis: {
            title: { text: 'Polynomial Degree (p)', font: { size: 14, color: '#2c3e50' } },
            gridcolor: '#e8e8e8',
            range: [0, 140],
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: { text: 'Efficiency Factor (E)', font: { size: 14, color: '#2c3e50' } },
            gridcolor: '#e8e8e8',
            range: [0, 1.1],
            showgrid: true,
            zeroline: false
        },
        plot_bgcolor: 'rgba(248, 249, 250, 0.8)',
        paper_bgcolor: 'transparent',
        font: { family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50' },
        legend: {
            x: 0.02,
            y: 0.98,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#ddd',
            borderwidth: 1,
            font: { size: 12 }
        },
        margin: { l: 60, r: 20, t: 20, b: 60 },
        hovermode: 'x unified',
        showlegend: true
    };

    const plotConfig: any = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        toImageButtonOptions: { format: 'png', filename: 'efficiency_analysis', height: 600, width: 800 }
    };

    if (typeof Plotly !== 'undefined') {
        Plotly.newPlot('efficiency-plot', traces, layout, plotConfig);
    }
}

// Update error plot
function updateErrorPlot() {
    const traces = [];

    // Clear loading state
    const errorPlotDiv = document.getElementById('error-plot');
    if (errorPlotDiv) {
        errorPlotDiv.classList.remove('loading');
    }

    // Parse function key for display
    let functionKey = config.testFunction;
    if (functionKey.includes(' - ')) {
        functionKey = functionKey.split(' - ')[0].replace('₁', '1').replace('₂', '2').replace('₃', '3').replace('₄', '4').replace('₅', '5');
    }

    // Lebedev errors
    if (analysisData.lebedev.points.length > 0 && analysisData.lebedev.errors.length > 0) {
        traces.push({
            x: analysisData.lebedev.points,
            y: analysisData.lebedev.errors,
            mode: 'lines+markers',
            name: 'Lebedev',
            line: { color: colors.lebedev, width: 3 },
            marker: { size: 8, symbol: 'x' }
        });
    }

    // Spherical design errors
    if (analysisData.sphericalDesign.points.length > 0 && analysisData.sphericalDesign.errors.length > 0) {
        traces.push({
            x: analysisData.sphericalDesign.points,
            y: analysisData.sphericalDesign.errors,
            mode: 'lines+markers',
            name: `Spherical Design (${config.sphericalDesignType})`,
            line: { color: colors.sphericalDesign, width: 3 },
            marker: { size: 8, symbol: 'x' }
        });
    }

    // Gaussian product errors
    if (analysisData.product.points.length > 0 && analysisData.product.errors.length > 0) {
        traces.push({
            x: analysisData.product.points,
            y: analysisData.product.errors,
            mode: 'lines+markers',
            name: 'Gaussian Product',
            line: { color: colors.product, width: 3 },
            marker: { size: 6, symbol: 'diamond' }
        });
    }

    // Monte Carlo errors
    if (analysisData.monteCarlo.points.length > 0 && analysisData.monteCarlo.errors.length > 0) {
        traces.push({
            x: analysisData.monteCarlo.points,
            y: analysisData.monteCarlo.errors,
            mode: 'lines+markers',
            name: 'Monte Carlo (Uniform)',
            line: { color: colors.monteCarlo1, width: 3 },
            marker: { size: 8, symbol: 'circle' }
        });
    }

    const isLogScale = config.plotType === 'loglog';

    const layout: any = {
        xaxis: {
            title: { text: 'Number of Points (N)', font: { size: 14, color: '#2c3e50' } },
            gridcolor: '#e8e8e8',
            type: isLogScale ? 'log' : 'linear',
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: { text: `Integration Error [${functionKey.toUpperCase()}]`, font: { size: 14, color: '#2c3e50' } },
            gridcolor: '#e8e8e8',
            type: isLogScale ? 'log' : 'linear',
            showgrid: true,
            zeroline: false
        },
        plot_bgcolor: 'rgba(248, 249, 250, 0.8)',
        paper_bgcolor: 'transparent',
        font: { family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50' },
        legend: {
            x: 0.98,
            y: 0.98,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#ddd',
            borderwidth: 1,
            font: { size: 12 }
        },
        margin: { l: 60, r: 20, t: 20, b: 60 },
        hovermode: 'x unified',
        showlegend: true
    };

    const plotConfig: any = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        toImageButtonOptions: { format: 'png', filename: 'error_analysis', height: 600, width: 800 }
    };

    if (typeof Plotly !== 'undefined') {
        Plotly.newPlot('error-plot', traces, layout, plotConfig);
    }
}

// Update statistics
function updateStats() {
    const allMethods = ['lebedev', 'sphericalDesign', 'product', 'monteCarlo'];
    let totalMethods = 0;
    let maxEfficiency = 0;
    let minError = Infinity;
    let totalPoints = 0;

    for (let method of allMethods) {
        const data = analysisData[method as keyof typeof analysisData];

        if (data.points && data.points.length > 0) {
            totalMethods++;
            totalPoints += Math.max(...data.points);
        }

        if (data.efficiencies && data.efficiencies.length > 0) {
            maxEfficiency = Math.max(maxEfficiency, ...data.efficiencies);
        }

        if (data.errors && data.errors.length > 0) {
            const methodMinError = Math.min(...data.errors);
            if (methodMinError < minError) {
                minError = methodMinError;
            }
        }
    }

    // Update HTML elements
    const totalMethodsEl = document.getElementById('total-methods');
    if (totalMethodsEl) totalMethodsEl.textContent = String(totalMethods);

    const maxEfficiencyEl = document.getElementById('max-efficiency');
    if (maxEfficiencyEl) maxEfficiencyEl.textContent = maxEfficiency.toFixed(3);

    const minErrorEl = document.getElementById('min-error');
    if (minErrorEl) minErrorEl.textContent = minError === Infinity ? 'N/A' : minError.toExponential(2);

    const totalPointsEl = document.getElementById('total-points');
    if (totalPointsEl) totalPointsEl.textContent = totalPoints.toLocaleString();
}

// Show loading state
function showLoadingState(isLoading: boolean) {
    const plots = ['efficiency-plot', 'error-plot'];

    plots.forEach(plotId => {
        const plotDiv = document.getElementById(plotId);
        if (isLoading) {
            if (!plotDiv) return;
            plotDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #74b9ff;">
                    <div style="font-size: 1.2em; margin-bottom: 20px;">⏳ Loading analysis data...</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%; animation: loadingProgress 2s ease-in-out infinite;"></div>
                    </div>
                </div>
                <style>
                    @keyframes loadingProgress {
                        0% { width: 0%; }
                        50% { width: 70%; }
                        100% { width: 0%; }
                    }
                </style>
            `;
        } else {
            // Clear loading content - plots will be updated separately
            if (plotDiv && plotDiv.innerHTML.includes('Loading')) {
                plotDiv.innerHTML = '';
            }
        }
    });
}

// Show error message
function showError(message: string) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <strong>⚠️ Error:</strong> ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2em;">&times;</button>
    `;

    const container = document.querySelector('.controls-panel');
    if (container) container.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 8000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.efficiencyAnalysis = {
    config,
    analysisData,
    updatePlots,
    loadAnalysisData
};

function sphericalToCartesian(phi: number, theta: number) {
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    return { x, y, z };
}