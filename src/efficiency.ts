import {
    generateLebedevPoints,
    generateSphericalDesign,
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
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
    maxPoints: 5780,
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

function Integrate(func: (phi: number, theta: number, ...args: any[]) => number, points: Array<{ phi?: number | null; theta?: number | null; weight?: number | null }>, ...args: any[]): number {
    return points.reduce((sum, pt) => {
        return sum + func(pt.phi!, pt.theta!, ...args) * pt.weight!;
    }, 0);
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
        const label = `f${toSubscript(idx + 1)}: ${tf.name}`;
        testFunctionOptions[label] = tf.value;
    });

    testFunctionFolder.add(config, 'testFunction', testFunctionOptions)
        .name('Test Function')
        .onChange(async () => {
            await loadAnalysisData();
            updatePlots();
            updateStats();
        });

    testFunctionFolder.add(config, 'functionParam', 1, 20, 1)
        .name('Parameter (a)')
        .onChange(async () => {
            await loadAnalysisData();
            updatePlots();
            updateStats();
        });
    // Store references for updates
    window.testFunctionFolder = testFunctionFolder;
}



// Load and calculate analysis data (efficiency + error)
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

        // Resolve test function using id-style config (same approach as main.ts)
        const tf = (testFunctions as any[]).find((t: any) => t.value === config.testFunction) || (testFunctions as any[])[1];
        const aParam = config.functionParam;
        const analyticalVal = tf.analyticalValue(aParam);

        // 1) Lebedev: compute efficiency and errors across entries, sorted by points
        try {
            const lebedevEntries = Object.entries(AVAILABLE_POINTS.lebedev)
                .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
                .filter(({ points }) => points <= config.maxPoints)
                .sort((a, b) => a.points - b.points);

            for (const { points, degree } of lebedevEntries) {
                const efficiency = Math.min(1, ((degree + 1) * (degree + 1)) / (3 * points));
                analysisData.lebedev.degrees.push(degree);
                analysisData.lebedev.points.push(points);
                analysisData.lebedev.efficiencies.push(efficiency);

                try {
                    const item = await generateLebedevPoints(points);
                    const pts = item?.data ?? [];
                    const approx = Integrate(tf.function, pts as any, aParam);
                    const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
                    analysisData.lebedev.errors.push(error);
                } catch (err) {
                    console.warn('Failed computing Lebedev errors:', err);
                }
            }
        } catch (err) {
            console.warn('Failed computing Lebedev analysis:', err);
        }

        // 2) Spherical Designs: compute for all three families
        const designFamilies: SphericalDesignType[] = ['HardinSloane', 'WomersleySym', 'WomersleyNonSym'];
        for (const fam of designFamilies) {
            try {
                const designMap = AVAILABLE_POINTS[fam] as Record<number, number>;
                const entries = Object.entries(designMap)
                    .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
                    .filter(({ points }) => points <= config.maxPoints)
                    .sort((a, b) => a.points - b.points);

                for (const { points, degree } of entries) {
                    const efficiency = Math.min(1, ((degree + 1) * (degree + 1)) / (3 * points));
                    (analysisData as any)[fam].degrees.push(degree);
                    (analysisData as any)[fam].points.push(points);
                    (analysisData as any)[fam].efficiencies.push(efficiency);

                    try {
                        const item = await generateSphericalDesign(points, fam);
                        const pts = item?.data ?? [];
                        const approx = Integrate(tf.function, pts as any, aParam);
                        const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
                        (analysisData as any)[fam].errors.push(error);
                    } catch (err) {
                        console.warn(`Failed computing ${fam} errors:`, err);
                    }
                }
            } catch (err) {
                console.warn(`Failed computing ${fam} analysis:`, err);
            }
        }

        // 3) Product quadrature: sweep internal N via points formula until maxPoints
        try {
            for (let n = 1; n <= config.maxPoints; n *= 2) {
                const pts = generateProductQuadrature(n) as any[];
                const approx = Integrate(tf.function, pts as any, aParam);
                const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
                analysisData.product.points.push(pts.length);
                analysisData.product.errors.push(error);
                analysisData.product.efficiencies.push(2 / 3);
                analysisData.product.degrees.push(Math.floor(Math.sqrt(2 * n) - 1));
            }
        } catch (err) {
            console.warn('Failed computing Product Quadrature errors:', err);
        }

        // 4) Monte Carlo
        try {
            for (let n = 1; n <= config.maxPoints; n *= 2) {
                const ptsClustered = generateMonteCarloClustered(n) as any[];
                const approxClustered = Integrate(tf.function, ptsClustered as any, aParam);
                const errorClustered = Math.max(Math.abs(approxClustered - analyticalVal), 1e-16);
                analysisData.monteCarloClustered.points.push(ptsClustered.length);
                analysisData.monteCarloClustered.errors.push(errorClustered);

                const ptsUniform = generateMonteCarloUniform(n) as any[];
                const approxUniform = Integrate(tf.function, ptsUniform as any, aParam);
                const errorUniform = Math.max(Math.abs(approxUniform - analyticalVal), 1e-16);
                analysisData.monteCarlo.points.push(ptsUniform.length);
                analysisData.monteCarlo.errors.push(errorUniform);
            }

            if (analysisData.monteCarlo.points.at(-1)! < config.maxPoints) {
                const ptsClustered = generateMonteCarloClustered(config.maxPoints) as any[];
                const approxClustered = Integrate(tf.function, ptsClustered as any, aParam);
                const errorClustered = Math.max(Math.abs(approxClustered - analyticalVal), 1e-16);
                analysisData.monteCarloClustered.points.push(ptsClustered.length);
                analysisData.monteCarloClustered.errors.push(errorClustered);

                const ptsUniform = generateMonteCarloUniform(config.maxPoints) as any[];
                const approxUniform = Integrate(tf.function, ptsUniform as any, aParam);
                const errorUniform = Math.max(Math.abs(approxUniform - analyticalVal), 1e-16);
                analysisData.monteCarlo.points.push(ptsUniform.length);
                analysisData.monteCarlo.errors.push(errorUniform);
            }
        } catch (err) {
            console.warn('Failed computing Monte Carlo (Clustered) errors:', err);
        }

    } catch (error) {
        console.error('❌ Failed to load analysis data:', error);
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// Update plots
function updatePlots() {
    // Always update both plots simultaneously
    drawEfficiencyPlot(analysisData, colors);
    const functionKey = config.testFunction; // already the id style like 'f1'
    drawErrorPlot(analysisData, colors, functionKey);
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
