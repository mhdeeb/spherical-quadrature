import lilGui from 'lil-gui';

import testFunctions from './test-functions';

declare global {
    interface Window {
        testFunctionFolder?: any;
        efficiencyAnalysis?: any;
    }
}
import { updateEfficiencyPlot as drawEfficiencyPlot, updateErrorPlot as drawErrorPlot } from './efficiency-plots.ts';

const MAX_POINTS = 10000;

// Configuration
const config = {
    testFunction: 'f1',
    functionParam: 9,
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
    showLoadingState(true);
    try {
        const params = new URLSearchParams({
            maxPoints: MAX_POINTS.toString(),
            testFunction: config.testFunction,
            functionParam: config.functionParam.toString()
        });

        const response = await fetch(`https://api.mhdeeb.com/analysis?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        analysisData = await response.json();
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
                    <div style="font-size: 1.2em; margin-bottom: 20px;">⏳ Loading analysis data, this will take a while...</div>
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
