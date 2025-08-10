import {
    generateLebedevPoints,
    generateSphericalDesign,
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
    prod_quad,
} from './sphere-quadrature-module.ts';

import testFunctions from './test-functions.ts';

import lilGui from 'lil-gui';

type SphericalDesignType = 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';

declare global {
    interface Window {
        testFunctionFolder?: any;
        efficiencyAnalysis?: any;
    }
}
import { updateEfficiencyPlot as drawEfficiencyPlot, updateErrorPlot as drawErrorPlot } from './efficiency-plots.ts';
import { AVAILABLE_POINTS } from './constants.ts';

// Configuration
const config = {
    testFunction: 'f1',
    functionParam: 9,
    sphericalDesignType: 'HardinSloane',
    maxPoints: 8700,
    plotType: 'loglog'
};

// GUI instance
let gui;

// Data storage
type AnalysisSeries = { degrees: number[]; points: number[]; efficiencies: number[]; errors: number[] };
let analysisData: {
    lebedev: AnalysisSeries;
    HardinSloane: AnalysisSeries;
    WomersleySym: AnalysisSeries;
    WomersleyNonSym: AnalysisSeries;
    product: AnalysisSeries;
    monteCarlo: AnalysisSeries;
    monteCarloClustered: AnalysisSeries;
} = {
    lebedev: { degrees: [], points: [], efficiencies: [], errors: [] },
    HardinSloane: { degrees: [], points: [], efficiencies: [], errors: [] },
    WomersleySym: { degrees: [], points: [], efficiencies: [], errors: [] },
    WomersleyNonSym: { degrees: [], points: [], efficiencies: [], errors: [] },
    product: { degrees: [], points: [], efficiencies: [], errors: [] },
    monteCarlo: { degrees: [], points: [], efficiencies: [], errors: [] },
    monteCarloClustered: { degrees: [], points: [], efficiencies: [], errors: [] },
};

// (Descriptions intentionally omitted)

// Color scheme (Okabe–Ito palette inspired; colorblind-friendly)
const colors: Record<string, string> = {
    lebedev: '#D55E00',             // Vermillion
    hardinSloane: '#0072B2',        // Blue
    womersleySym: '#009E73',        // Bluish green
    womersleyNonSym: '#CC79A7',     // Reddish purple
    product: '#E69F00',             // Orange
    monteCarlo1: '#56B4E9',         // Sky blue
    monteCarlo2: '#000000'          // Black (clustered, dashed in plot)
};

// Initialize the application
async function init() {


    try {
        initializeGUI();

        await loadAnalysisData();

        updatePlots();

        updateStats();


    } catch (error) {
        console.error('❌ Failed to initialize:', error);
        const message = (error instanceof Error) ? error.message : String(error);
        showError('Failed to initialize efficiency analysis: ' + message);
    }
}

// Initialize GUI controls
function initializeGUI() {
    const container = document.getElementById('gui-container');
    if (!container) {
        console.error('❌ GUI container not found!');
        return;
    }


    if (typeof lilGui === 'undefined') {
        console.error('❌ lilGui is not available! Import failed.');
        return;
    }


    try {
        gui = new lilGui({ container: container, width: 340 });
        gui.title('📊 Spherical Quadrature Analysis');

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
}



// Load and calculate analysis data
async function loadAnalysisData() {


    // Show loading state
    showLoadingState(true);

    try {
        // Clear existing data
        analysisData = {
            lebedev: { degrees: [], points: [], efficiencies: [], errors: [] },
            HardinSloane: { degrees: [], points: [], efficiencies: [], errors: [] },
            WomersleySym: { degrees: [], points: [], efficiencies: [], errors: [] },
            WomersleyNonSym: { degrees: [], points: [], efficiencies: [], errors: [] },
            product: { degrees: [], points: [], efficiencies: [], errors: [] },
            monteCarlo: { degrees: [], points: [], efficiencies: [], errors: [] },
            monteCarloClustered: { degrees: [], points: [], efficiencies: [], errors: [] },
        };

        // Calculate both efficiency and error data for all methods
        await calculateEfficiencyData();
        await calculateErrorData();


    } catch (error) {
        console.error('❌ Failed to load analysis data:', error);
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// Calculate efficiency factors based on McLaren (1963)
async function calculateEfficiencyData() {
    // Clear existing efficiency data only (preserve errors for now)
    analysisData.lebedev.degrees = [];
    analysisData.lebedev.points = [];
    analysisData.lebedev.efficiencies = [];

    analysisData.HardinSloane.degrees = [];
    analysisData.HardinSloane.points = [];
    analysisData.HardinSloane.efficiencies = [];
    analysisData.WomersleySym.degrees = [];
    analysisData.WomersleySym.points = [];
    analysisData.WomersleySym.efficiencies = [];
    analysisData.WomersleyNonSym.degrees = [];
    analysisData.WomersleyNonSym.points = [];
    analysisData.WomersleyNonSym.efficiencies = [];

    analysisData.product.degrees = [];
    analysisData.product.points = [];
    analysisData.product.efficiencies = [];

    // 1) Lebedev: mapping is points -> degree
    try {
        const lebedevEntries = Object.entries(AVAILABLE_POINTS.lebedev)
            .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
            .filter(({ points }) => points <= config.maxPoints)
            .sort((a, b) => a.degree - b.degree);

        for (const { points, degree } of lebedevEntries) {
            const efficiency = ((degree + 1) * (degree + 1)) / (3 * points);
            analysisData.lebedev.degrees.push(degree);
            analysisData.lebedev.points.push(points);
            analysisData.lebedev.efficiencies.push(Math.min(1, efficiency));
        }
    } catch (err) {
        console.warn('Failed computing Lebedev efficiencies:', err);
    }

    // 2) Spherical Designs: compute for all three families
    const designFamilies: SphericalDesignType[] = ['HardinSloane', 'WomersleySym', 'WomersleyNonSym'];
    for (const fam of designFamilies) {
        try {
            const designMap = AVAILABLE_POINTS[fam] as Record<number, number>;
            const entries = Object.entries(designMap)
                .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
                .filter(({ points }) => points <= config.maxPoints)
                .sort((a, b) => a.degree - b.degree);

            for (const { points, degree } of entries) {
                const efficiency = Math.min(1, ((degree + 1) * (degree + 1)) / (3 * points));
                analysisData[fam].degrees.push(degree);
                analysisData[fam].points.push(points);
                analysisData[fam].efficiencies.push(efficiency);
            }
        } catch (err) {
            console.warn(`Failed computing ${fam} efficiencies:`, err);
        }
    }

    // 3) Product quadrature: internal N inferred from points: points ≈ (2N+1) * N, degree ≈ N
    analysisData.product.degrees.push(1);
    analysisData.product.efficiencies.push(2 / 3);
    analysisData.product.degrees.push(Math.max(
        analysisData.lebedev.degrees[analysisData.lebedev.degrees.length - 1] || 1,
        analysisData.HardinSloane.degrees[analysisData.HardinSloane.degrees.length - 1] || 1,
        analysisData.WomersleySym.degrees[analysisData.WomersleySym.degrees.length - 1] || 1,
        analysisData.WomersleyNonSym.degrees[analysisData.WomersleyNonSym.degrees.length - 1] || 1,
    ));
    analysisData.product.efficiencies.push(2 / 3);
}

// Calculate integration errors for test functions
async function calculateErrorData() {
    // Helper to fetch test function by config key
    const resolveTestFunction = () => {
        // config.testFunction may be a shorthand like 'f2' or a label like 'f₂ - Gaussian Peaks'
        let key = config.testFunction;
        if (key.includes(' - ')) {
            key = key.split(' - ')[0].replace('₁', '1').replace('₂', '2').replace('₃', '3').replace('₄', '4').replace('₅', '5');
        }
        const tf = (testFunctions as any[]).find((t: any) => t.value === key) || (testFunctions as any[])[1];
        return tf as { function: (phi: number, theta: number, a: number) => number; analyticalValue: (a: number) => number };
    };

    const tf = resolveTestFunction();
    const aParam = config.functionParam;

    // Reset errors and points for all methods
    analysisData.lebedev.errors = [];
    analysisData.lebedev.points = [];
    analysisData.HardinSloane.errors = [];
    analysisData.HardinSloane.points = [];
    analysisData.WomersleySym.errors = [];
    analysisData.WomersleySym.points = [];
    analysisData.WomersleyNonSym.errors = [];
    analysisData.WomersleyNonSym.points = [];
    analysisData.product.errors = [];
    analysisData.product.points = [];
    analysisData.monteCarlo.errors = [];
    analysisData.monteCarlo.points = [];
    analysisData.monteCarloClustered.errors = [];
    analysisData.monteCarloClustered.points = [];

    const analyticalVal = tf.analyticalValue(aParam);

    // Utility: compute normalized integral (average over sphere) from points with weights
    const integrateNormalized = (points: Array<{ phi?: number | null; theta?: number | null; weight?: number | null }>) => {
        if (!points || points.length === 0) return NaN;
        let sumW = 0;
        let sumWF = 0;
        const N = points.length;
        for (let i = 0; i < N; i++) {
            const p = points[i];
            const w = (typeof p.weight === 'number' && isFinite(p.weight)) ? (p.weight as number) : 1 / N;
            const phi = (p.phi ?? 0) as number;
            const theta = (p.theta ?? 0) as number;
            const f = tf.function(phi, theta, aParam);
            sumW += w;
            sumWF += w * f;
        }
        if (sumW === 0) return NaN;
        return sumWF / sumW;
    };

    // 1) Lebedev errors across available point counts (<= maxPoints)
    try {
        const lebedevEntries = Object.entries(AVAILABLE_POINTS.lebedev)
            .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
            .filter(({ points }) => points <= config.maxPoints)
            .sort((a, b) => a.points - b.points);

        for (const { points } of lebedevEntries) {
            if (points > config.maxPoints) break;

            const item = await generateLebedevPoints(points);
            const pts = item?.data ?? [];
            const approx = integrateNormalized(pts as any);
            const error = Math.abs(approx - analyticalVal);
            analysisData.lebedev.points.push(pts.length);
            analysisData.lebedev.errors.push(error);
        }
    } catch (err) {
        console.warn('Failed computing Lebedev errors:', err);
    }

    // 2) Spherical Design errors across available point counts (<= maxPoints) for all families
    for (const fam of ['HardinSloane', 'WomersleySym', 'WomersleyNonSym'] as SphericalDesignType[]) {
        try {
            const designMap = AVAILABLE_POINTS[fam] as Record<number, number>;
            const allPoints = Object.keys(designMap)
                .map(n => Number(n))
                .filter(points => Number.isFinite(points) && points > 0 && points <= config.maxPoints)
                .sort((a, b) => a - b);

            for (const points of allPoints) {
                const item = await generateSphericalDesign(points, fam, 'points');
                const pts = item?.data ?? [];
                const approx = integrateNormalized(pts as any);
                const error = Math.abs(approx - analyticalVal);
                (analysisData as any)[fam].points.push(pts.length);
                (analysisData as any)[fam].errors.push(error);
            }
        } catch (err) {
            console.warn(`Failed computing ${fam} Spherical Design errors:`, err);
        }
    }

    // 3) Product quadrature: sweep internal N via points formula until maxPoints
    try {
        for (let N = 1; N < config.maxPoints; N *= 2) {
            const pts = generateProductQuadrature(N) as any[];
            const approx = integrateNormalized(pts as any);
            const size = pts.length;

            // const approx = prod_quad(tf.function, N, 2 * N + 1, aParam);
            // const size = N;

            const error = Math.abs(approx - analyticalVal);
            analysisData.product.points.push(size);
            analysisData.product.errors.push(error);
        }
    } catch (err) {
        console.warn('Failed computing Product errors:', err);
    }

    // 4) Monte Carlo (Uniform): logarithmic sweep up to maxPoints
    try {
        const mcPoints: number[] = [];
        // start at 1 and double up to maxPoints, also include maxPoints if not exact power of two
        for (let n = 1; n <= config.maxPoints; n *= 2) {
            mcPoints.push(n);
            if (n === 0) break; // safety
        }
        if (mcPoints.length === 0 || mcPoints[mcPoints.length - 1] !== config.maxPoints) {
            mcPoints.push(config.maxPoints);
        }

        for (const n of mcPoints) {
            const pts = generateMonteCarloUniform(n) as any[];
            const approx = integrateNormalized(pts as any);
            const error = Math.abs(approx - analyticalVal);
            analysisData.monteCarlo.points.push(pts.length);
            analysisData.monteCarlo.errors.push(error);
        }
    } catch (err) {
        console.warn('Failed computing Monte Carlo errors:', err);
    }

    // 5) Monte Carlo (Clustered): same sweep
    try {
        const mcPoints: number[] = [];
        for (let n = 1; n <= config.maxPoints; n *= 2) {
            mcPoints.push(n);
            if (n === 0) break;
        }
        if (mcPoints.length === 0 || mcPoints[mcPoints.length - 1] !== config.maxPoints) {
            mcPoints.push(config.maxPoints);
        }

        for (const n of mcPoints) {
            const pts = generateMonteCarloClustered(n) as any[];
            const approx = integrateNormalized(pts as any);
            const error = Math.abs(approx - analyticalVal);
            analysisData.monteCarloClustered.points.push(pts.length);
            analysisData.monteCarloClustered.errors.push(error);
        }
    } catch (err) {
        console.warn('Failed computing Clustered Monte Carlo errors:', err);
    }
}

// Update plots
function updatePlots() {
    // Always update both plots simultaneously
    drawEfficiencyPlot(analysisData, colors, { plotType: config.plotType as 'loglog' | 'linear' });

    let functionKey = config.testFunction;
    if (functionKey.includes(' - ')) {
        functionKey = functionKey.split(' - ')[0].replace('₁', '1').replace('₂', '2').replace('₃', '3').replace('₄', '4').replace('₅', '5');
    }
    drawErrorPlot(analysisData, colors, config.plotType as 'loglog' | 'linear', functionKey);
}

// Update efficiency plot
// Removed inline plot drawers in favor of reusable functions in efficiency-plots.ts

// Update statistics
function updateStats() {
    const allMethods = ['lebedev', 'HardinSloane', 'WomersleySym', 'WomersleyNonSym', 'product', 'monteCarlo', 'monteCarloClustered'];
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
