import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import lilGui from 'lil-gui';

import {
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
    generateLebedevPoints,
    generateSphericalDesign,
} from './sphere-quadrature-module.js';

import testFunctions from './test-functions.js';

let scene, camera, renderer, controls;
let sphereGroup, pointGroup, surfaceGroup;

let sphereRadius = 2;
let sphereGeometry, sphereMaterial, sphereMesh;

window.currentMode = 'harmonics';
window.currentQuadMethod = 'monte_carlo_uniform';
window.numPoints = 100;
window.harmonicL = 2;
window.harmonicM = 0;
window.currentTestFunction = 'f1';
window.functionParam = 1.0;

window.showSphere = true;
window.showPoints = true;
window.showColorMap = true;
window.wireframe = false;
window.pointSize = 6;
window.sphereOpaque = false;

window.autoRotate = true;
window.rotationSpeed = 1.0;

let quadraturePoints = [];

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: false // Prevent canvas copying
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;

    renderer.domElement.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    renderer.domElement.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    });

    renderer.domElement.addEventListener('selectstart', function (e) {
        e.preventDefault();
        return false;
    });

    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.autoRotate = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    sphereGroup = new THREE.Group();
    pointGroup = new THREE.Group();
    surfaceGroup = new THREE.Group();

    scene.add(sphereGroup);
    scene.add(pointGroup);
    scene.add(surfaceGroup);

    createBaseSphere();

    initializeGUI();

    console.log('Initializing with default quadrature points');
    await updateQuadraturePoints();

    triggerUpdate();

    animate();
}

function createBaseSphere() {
    if (sphereMesh) {
        sphereGroup.remove(sphereMesh);
    }

    sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 32);

    sphereMaterial = new THREE.MeshLambertMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.3,
        wireframe: wireframe
    });

    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereGroup.add(sphereMesh);
}

function updateQuadratureVisualization(forceRecreate = false) {
    const existingPointCount = pointGroup.children.length;
    const hasCorrectPointCount = existingPointCount === quadraturePoints.length;

    if (!hasCorrectPointCount || forceRecreate) {
        const reason = forceRecreate ? 'force recreation' : `count mismatch (${existingPointCount} -> ${quadraturePoints.length})`;
        console.log(`🔄 Recreating points: ${reason}`);
        pointGroup.clear();

        if (window.showPoints && quadraturePoints.length > 0) {
            const pointRadius = (window.pointSize || 6) * 0.01;
            const pointGeometry = new THREE.SphereGeometry(pointRadius, 8, 6);
            const pointMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

            quadraturePoints.forEach(point => {
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.userData.originalRadius = pointRadius;
                if (point.x !== undefined) {
                    pointMesh.position.set(point.x, point.y, point.z);
                } else {
                    pointMesh.position.copy(point);
                }
                pointGroup.add(pointMesh);
            });
        }
    } else {
        console.log('🎨 Updating existing point display properties');
        pointGroup.visible = window.showPoints;

        if (window.showPoints) {
            const newPointRadius = (window.pointSize || 6) * 0.01;
            pointGroup.children.forEach(pointMesh => {
                const originalRadius = pointMesh.userData.originalRadius || 0.06;
                const scaleFactor = newPointRadius / originalRadius;
                pointMesh.scale.setScalar(scaleFactor);
            });
        }
    }
}

function updateSurfaceVisualization() {
    surfaceGroup.clear();

    if (window.sphereDisplay !== 'colormap') {
        return;
    }

    const resolution = 64;
    const geometry = new THREE.SphereGeometry(sphereRadius * 1.005, resolution, resolution / 2);
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        const r = Math.sqrt(x * x + y * y + z * z);
        const phi = Math.acos(Math.max(-1, Math.min(1, z / r)));
        const theta = Math.atan2(y, x);

        let colorValue;

        if (window.currentMode === 'harmonics') {
            try {
                const ylm = sphericalHarmonic(window.harmonicL, window.harmonicM, theta, phi);
                const maxVal = 1;
                colorValue = Math.max(0, Math.min(1, (ylm + maxVal) / (2 * maxVal)));
            } catch (e) {
                colorValue = 0.5;
            }
        } else if (window.currentMode === 'function') {
            try {
                const funcValue = evaluateTestFunction(window.currentTestFunction, phi, theta, window.functionParam);
                const range = getFunctionRange(window.currentTestFunction, window.functionParam);
                colorValue = Math.max(0, Math.min(1, (funcValue - range.min) / (range.max - range.min)));
            } catch (e) {
                colorValue = 0.5;
            }
        } else {
            colorValue = 0.5;
        }

        if (colorValue < 0.5) {
            colors[i] = 0;
            colors[i + 1] = colorValue * 2;
            colors[i + 2] = 1;
        } else {
            colors[i] = (colorValue - 0.5) * 2;
            colors[i + 1] = 1;
            colors[i + 2] = 1 - (colorValue - 0.5) * 2;
        }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent: window.sphereOpacity < 1.0,
        opacity: window.sphereOpacity,
        side: THREE.DoubleSide
    });

    const surfaceMesh = new THREE.Mesh(geometry, material);
    surfaceGroup.add(surfaceMesh);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    if (window.autoRotate) {
        const rotationSpeed = window.rotationSpeed * 0.01;
        sphereGroup.rotation.y += rotationSpeed;
        pointGroup.rotation.y += rotationSpeed;
        surfaceGroup.rotation.y += rotationSpeed;
    }

    updateVisualizationIfNeeded();

    renderer.render(scene, camera);

    updateInfoPanelIfNeeded();
}

function updateInfoPanelIfNeeded() {
    if (needsInfoPanelUpdate) {
        updateInfoPanel();
        needsInfoPanelUpdate = false;
    }
}

function getSphericalHarmonicDisplayName(l, m) {
    const subscriptDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    const superscriptDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    const lStr = l.toString();
    const subscript = lStr.split('').map(digit => subscriptDigits[parseInt(digit)]).join('');

    const absM = Math.abs(m);
    const mStr = absM.toString();
    const superscript = mStr.split('').map(digit => superscriptDigits[parseInt(digit)]).join('');
    const finalSuperscript = m >= 0 ? superscript : `⁻${superscript}`;

    return `Y${subscript}${finalSuperscript}`;
}

function getEffectiveNumPointsFromState(state) {
    const desired = state.numPoints || 100;
    const minPoints = Math.max(1, desired);
    const naxPoints = Math.min(10000, minPoints);

    return naxPoints;
}

function getEffectiveNumPoints() {
    return getEffectiveNumPointsFromState(appState);
}


function updateInfoPanel() {
    const info = document.getElementById('dynamicInfo');
    if (!info) return;

    let content = '';

    content += `<div class="info-section">`;
    content += `<div class="info-header">📊 System Status</div>`;

    const modeNames = {
        'harmonics': '🌐 Spherical Harmonics',
        'function': '📈 Function Integration'
    };
    content += `<div class="info-row"><span class="info-label">Mode:</span> ${modeNames[window.currentMode] || window.currentMode}</div>`;

    const quadNames = {
        'monte_carlo_uniform': 'Monte Carlo (Uniform)',
        'monte_carlo_clustered': 'Monte Carlo (Clustered)',
        'lebedev': 'Lebedev Quadrature',
        'product': 'Product Quadrature',
        'HardinSloane': 'HardinSloane',
        'WomersleySym': 'WomersleySym',
        'WomersleyNonSym': 'WomersleyNonSym'
    };
    content += `<div class="info-row"><span class="info-label">Method:</span> ${quadNames[window.currentQuadMethod] || window.currentQuadMethod}</div>`;

    const desiredPoints = window.numPoints;

    const calculationPoints = getEffectiveNumPoints();
    const actualPoints = quadraturePoints.length;
    const hasAdjustment = calculationPoints !== desiredPoints;
    const hasFinalDifference = actualPoints !== calculationPoints;

    content += `<div class="info-row"><span class="info-label">Desired:</span> ${desiredPoints}</div>`;

    if (hasAdjustment) {
        const reason = window.currentQuadMethod === 'lebedev' ? 'closest Lebedev order' :
            window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym' ? 'closest available design' :
                'valid range';
        content += `<div class="info-row"><span class="info-label">Calculation:</span> ${calculationPoints} <span class="info-detail">(${reason})</span></div>`;
    }

    if (hasFinalDifference || hasAdjustment) {
        const suffix = window.currentQuadMethod === 'lebedev' ? ' (Lebedev order)' :
            window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym' ? ' (design points)' : '';
        content += `<div class="info-row"><span class="info-label">Actual:</span> ${actualPoints}${suffix}</div>`;
    } else if (!hasAdjustment) {
        content += `<div class="info-row"><span class="info-label">Points:</span> ${actualPoints}</div>`;
    }

    content += `</div>`;


    if (window.currentMode === 'harmonics') {
        content += `<div class="info-section">`;
        content += `<div class="info-header">🌐 Spherical Harmonic</div>`;
        const harmonicName = getSphericalHarmonicDisplayName(window.harmonicL, window.harmonicM);
        content += `<div class="info-row"><span class="info-label">Function:</span> ${harmonicName}(θ,φ)</div>`;
        content += `<div class="info-row"><span class="info-label">Degree (ℓ):</span> ${window.harmonicL}</div>`;
        content += `<div class="info-row"><span class="info-label">Order (m):</span> ${window.harmonicM}</div>`;
        content += `</div>`;
    } else if (window.currentMode === 'function') {
        content += `<div class="info-section">`;
        content += `<div class="info-header">📈 Test Function</div>`;
        const functionNames = {
            'f1': 'f₁: x² + y² + z²',
            'f2': 'f₂: x',
            'f3': 'f₃: x × y',
            'f4': 'f₄: exp(x + y + z)',
            'f5': 'f₅: cos(a × φ)'
        };
        content += `<div class="info-row"><span class="info-label">Function:</span> ${functionNames[window.currentTestFunction] || window.currentTestFunction}</div>`;
        content += `<div class="info-row"><span class="info-label">Parameter:</span> ${window.functionParam.toFixed(3)}</div>`;
        content += `</div>`;
    }

    const integrationResults = computeIntegrationResults();
    if (integrationResults) {
        content += integrationResults;
    }

    info.innerHTML = content;
}

function computeIntegrationResults() {
    if (quadraturePoints.length === 0) return null;

    let content = `<div class="info-section integration-results">`;
    content += `<div class="info-header">🧮 Integration Results</div>`;

    let numericalValue = 0;
    let analyticalValue = null;

    try {
        if (window.currentMode === 'function') {
            let f_mean = 0;
            const N = quadraturePoints.length;

            for (let i = 0; i < N; i++) {
                const point = quadraturePoints[i];
                const phi = point.phi !== undefined ? point.phi : Math.acos(Math.max(-1, Math.min(1, point.z / Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z))));
                const theta = point.theta !== undefined ? point.theta : Math.atan2(point.y, point.x);
                const funcValue = evaluateTestFunction(window.currentTestFunction, phi, theta, window.functionParam);

                if (window.currentQuadMethod === 'monte_carlo_uniform') {
                    f_mean += funcValue;
                } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                    f_mean += funcValue * Math.sin(phi);
                } else if (window.currentQuadMethod === 'lebedev') {
                    const weight = point.weight !== undefined ? point.weight : (1.0 / N);
                    numericalValue += funcValue * weight;
                } else if (window.currentQuadMethod === 'product') {
                    const weight = point.weight !== undefined ? point.weight : (1.0 / N);
                    numericalValue += funcValue * weight;
                } else if (window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym') {
                    f_mean += funcValue;
                }
            }

            if (window.currentQuadMethod === 'monte_carlo_uniform') {
                f_mean = f_mean / N;
                const V = 4 * Math.PI;
                numericalValue = f_mean * V / (4 * Math.PI);
            } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                f_mean = f_mean / N;
                const V = 2 * Math.PI * Math.PI;
                numericalValue = f_mean * V / (4 * Math.PI);
            } else if (window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym') {
                numericalValue = f_mean / N;
            }

            analyticalValue = getAnalyticalValue(window.currentTestFunction, window.functionParam);
            if (analyticalValue !== null) {
                analyticalValue = analyticalValue / (4 * Math.PI);
            }
        } else if (window.currentMode === 'harmonics') {
            let f_mean = 0;
            const N = quadraturePoints.length;

            for (let i = 0; i < N; i++) {
                const point = quadraturePoints[i];
                const phi = point.phi !== undefined ? point.phi : Math.acos(Math.max(-1, Math.min(1, point.z / Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z))));
                const theta = point.theta !== undefined ? point.theta : Math.atan2(point.y, point.x);
                const ylm = sphericalHarmonic(window.harmonicL, window.harmonicM, theta, phi);

                if (window.currentQuadMethod === 'monte_carlo_uniform') {
                    f_mean += ylm;
                } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                    f_mean += ylm * Math.sin(phi);
                } else if (window.currentQuadMethod === 'lebedev') {
                    const weight = point.weight !== undefined ? point.weight : (1.0 / N);
                    numericalValue += ylm * weight;
                } else if (window.currentQuadMethod === 'product') {
                    const weight = point.weight !== undefined ? point.weight : (1.0 / N);
                    numericalValue += ylm * weight;
                } else if (window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym') {
                    f_mean += ylm;
                }
            }

            if (window.currentQuadMethod === 'monte_carlo_uniform') {
                f_mean = f_mean / N;
                const V = 4 * Math.PI;
                numericalValue = f_mean * V / (4 * Math.PI);
            } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                f_mean = f_mean / N;
                const V = 2 * Math.PI * Math.PI;
                numericalValue = f_mean * V / (4 * Math.PI);
            } else if (window.currentQuadMethod === 'HardinSloane' || window.currentQuadMethod === 'WomersleySym' || window.currentQuadMethod === 'WomersleyNonSym') {
                numericalValue = f_mean / N;
            }

            analyticalValue = (window.harmonicL === 0 && window.harmonicM === 0) ? 1 / (4 * Math.PI) : 0;
        }

        content += `<div class="info-row"><span class="info-label">Numerical:</span> <span class="numerical-value">${numericalValue.toExponential(6)}</span></div>`;

        if (analyticalValue !== null) {
            content += `<div class="info-row"><span class="info-label">Analytical:</span> <span class="analytical-value">${analyticalValue.toExponential(6)}</span></div>`;

            const absoluteError = Math.abs(numericalValue - analyticalValue);
            const relativeError = analyticalValue !== 0 ? Math.abs((numericalValue - analyticalValue) / analyticalValue) : 0;

            content += `<div class="info-row"><span class="info-label">Abs. Error:</span> <span class="error-value ${absoluteError < 1e-6 ? 'good-error' : absoluteError < 1e-3 ? 'moderate-error' : 'poor-error'}">${absoluteError.toExponential(3)}</span></div>`;
            content += `<div class="info-row"><span class="info-label">Rel. Error:</span> <span class="error-value ${relativeError < 1e-6 ? 'good-error' : relativeError < 1e-3 ? 'moderate-error' : 'poor-error'}">${(relativeError * 100).toFixed(4)}%</span></div>`;

            let accuracy = 'Poor';
            let accuracyClass = 'poor-accuracy';
            if (relativeError < 1e-8) {
                accuracy = 'Excellent';
                accuracyClass = 'excellent-accuracy';
            } else if (relativeError < 1e-6) {
                accuracy = 'Very Good';
                accuracyClass = 'good-accuracy';
            } else if (relativeError < 1e-3) {
                accuracy = 'Good';
                accuracyClass = 'moderate-accuracy';
            }
            content += `<div class="info-row"><span class="info-label">Accuracy:</span> <span class="accuracy-badge ${accuracyClass}">${accuracy}</span></div>`;
        } else {
            content += `<div class="info-row"><span class="info-label">Analytical:</span> <span class="info-detail">Not available</span></div>`;
        }

    } catch (error) {
        content += `<div class="info-row error-message">Integration Error: ${error.message}</div>`;
    }

    content += `</div>`;
    return content;
}

let needsUpdate = false;
let needsInfoPanelUpdate = false;

async function updateVisualizationIfNeeded() {
    if (needsUpdate) {
        console.log('Updating visualization...');
        await updateQuadraturePoints();
        updateQuadratureVisualization(window.forcePointRecreation || false);
        updateSurfaceVisualization();
        updateSphereAppearance();
        needsInfoPanelUpdate = true;
        needsUpdate = false;
        window.forcePointRecreation = false;
        console.log('Visualization update complete');
    }
}

function updateSphereAppearance() {
    if (sphereMesh) {
        if (window.sphereDisplay === 'colormap') {
            sphereMesh.visible = false;
        } else {
            sphereMesh.visible = true;

            sphereMesh.material.wireframe = (window.sphereDisplay === 'wireframe');

            sphereMesh.material.transparent = window.sphereOpacity < 1.0;
            sphereMesh.material.opacity = window.sphereOpacity;
        }

        sphereMesh.material.needsUpdate = true;
    }
}

function triggerUpdate(forcePointRecreation = false) {
    needsUpdate = true;
    window.forcePointRecreation = forcePointRecreation;
}



async function updateQuadraturePoints() {
    const desiredPoints = window.numPoints;
    const calculationPoints = getEffectiveNumPoints();

    if (desiredPoints === calculationPoints) {
        console.log(`Updating quadrature points: method=${window.currentQuadMethod}, points=${desiredPoints}`);
    } else {
        console.log(`Updating quadrature points: method=${window.currentQuadMethod}, desired=${desiredPoints} → calculation=${calculationPoints}`);
    }

    let points;

    try {
        switch (window.currentQuadMethod) {
            case 'monte_carlo_uniform':
                console.log('🎲 Generating Monte Carlo Uniform points');
                points = generateMonteCarloUniform(calculationPoints);
                break;
            case 'monte_carlo_clustered':
                console.log('🎲 Generating Monte Carlo Clustered points');
                points = generateMonteCarloClustered(calculationPoints);
                break;
            case 'lebedev':
                console.log('📊 Loading Lebedev points...');
                points = await generateLebedevPoints(calculationPoints);
                if (!points) {
                    console.warn('Lebedev data not available, falling back to Monte Carlo');
                    points = generateMonteCarloUniform(calculationPoints);
                }
                break;
            case 'product':
                points = generateProductQuadrature(calculationPoints);
                break;
            case 'HardinSloane':
            case 'WomersleySym':
            case 'WomersleyNonSym':
                points = await generateSphericalDesign(calculationPoints, window.currentQuadMethod);
                break;
            default:
                console.warn(`Unknown quadrature method: ${window.currentQuadMethod}, using Monte Carlo uniform`);
                points = generateMonteCarloUniform(calculationPoints);
        }

        if (!points || points.length === 0) {
            console.error(`No points generated for method: ${window.currentQuadMethod}`);
            points = generateMonteCarloUniform(calculationPoints);
        }

        quadraturePoints = points;
        console.log(`Generated ${quadraturePoints.length} points using ${window.currentQuadMethod}`);

    } catch (error) {
        console.error(`Error generating quadrature points for ${window.currentQuadMethod}:`, error);
        const fallbackPoints = getEffectiveNumPoints();
        quadraturePoints = generateMonteCarloUniform(fallbackPoints);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const appState = {
    mode: 'harmonics',
    quadMethod: 'monte_carlo_uniform',
    numPoints: 100,

    harmonicL: 2,
    harmonicM: 0,

    testFunction: 'f1',
    functionParam: 1.0,

    sphereDisplay: 'colormap',
    sphereOpacity: 1.0,
    showPoints: true,
    pointSize: 6,

    autoRotate: true,
    rotationSpeed: 1.0
};

function syncStateToWindow() {
    window.currentMode = appState.mode;
    window.currentQuadMethod = appState.quadMethod;
    window.numPoints = appState.numPoints;
    window.harmonicL = appState.harmonicL;
    window.harmonicM = appState.harmonicM;
    window.currentTestFunction = appState.testFunction;
    window.functionParam = appState.functionParam;
    window.sphereDisplay = appState.sphereDisplay;
    window.sphereOpacity = appState.sphereOpacity;
    window.showPoints = appState.showPoints;
    window.pointSize = appState.pointSize;

    window.showSphere = appState.sphereDisplay !== 'hidden';
    window.wireframe = appState.sphereDisplay === 'wireframe';
    window.showColorMap = appState.sphereDisplay === 'colormap';
    window.sphereOpaque = appState.sphereOpacity >= 1.0;
    window.autoRotate = appState.autoRotate;
    window.rotationSpeed = appState.rotationSpeed;
}

function syncWindowToState() {
    appState.mode = window.currentMode || appState.mode;
    appState.quadMethod = window.currentQuadMethod || appState.quadMethod;
    appState.numPoints = window.numPoints || appState.numPoints;
    appState.harmonicL = window.harmonicL || appState.harmonicL;
    appState.harmonicM = window.harmonicM || appState.harmonicM;
    appState.testFunction = window.currentTestFunction || appState.testFunction;
    appState.functionParam = window.functionParam || appState.functionParam;
    appState.sphereDisplay = window.sphereDisplay || appState.sphereDisplay;
    appState.sphereOpacity = window.sphereOpacity !== undefined ? window.sphereOpacity : appState.sphereOpacity;
    appState.showPoints = window.showPoints !== undefined ? window.showPoints : appState.showPoints;
    appState.pointSize = window.pointSize || appState.pointSize;
    appState.autoRotate = window.autoRotate !== undefined ? window.autoRotate : appState.autoRotate;
    appState.rotationSpeed = window.rotationSpeed || appState.rotationSpeed;
}

const QUADRATURE_AFFECTING_PROPERTIES = [
    'mode', 'quadMethod', 'numPoints',
    'harmonicL', 'harmonicM', 'testFunction', 'functionParam'
];

const INFO_PANEL_AFFECTING_PROPERTIES = [
    'quadMethod', 'numPoints',
    'mode', 'harmonicL', 'harmonicM', 'testFunction', 'functionParam'
];

function updateState(updates) {
    const oldState = { ...appState };

    const validatedUpdates = validateStateUpdates(updates);

    Object.assign(appState, validatedUpdates);

    syncStateToWindow();

    if (gui && settings) {
        syncStateToGUI();
    }

    notifyStateChange(oldState, appState);

    const hasQuadraturePropertyChange = Object.keys(validatedUpdates).some(key =>
        QUADRATURE_AFFECTING_PROPERTIES.includes(key)
    );

    const hasInfoPanelPropertyChange = Object.keys(validatedUpdates).some(key =>
        INFO_PANEL_AFFECTING_PROPERTIES.includes(key)
    );

    if (hasInfoPanelPropertyChange) {
        needsInfoPanelUpdate = true;
    }

    if (hasQuadraturePropertyChange) {
        const oldEffectivePoints = getEffectiveNumPointsFromState(oldState);
        const newEffectivePoints = getEffectiveNumPoints();
        const actuallyNeedsRegeneration =
            oldEffectivePoints !== newEffectivePoints ||
            oldState.quadMethod !== appState.quadMethod ||
            oldState.sphericalDesignType !== appState.sphericalDesignType ||
            oldState.mode !== appState.mode ||
            oldState.harmonicL !== appState.harmonicL ||
            oldState.harmonicM !== appState.harmonicM ||
            oldState.testFunction !== appState.testFunction ||
            oldState.functionParam !== appState.functionParam;

        if (actuallyNeedsRegeneration) {
            console.log(`🔄 Effective points changed: ${oldEffectivePoints} → ${newEffectivePoints}, regenerating...`);
            triggerUpdate(true);
        } else {
            console.log(`🎯 Desired points changed but effective points unchanged (${newEffectivePoints}), skipping regeneration`);
        }
    } else {
        console.log('🎨 Display-only change detected, updating visualization...');
        updateQuadratureVisualization();
        updateSurfaceVisualization();
        updateSphereAppearance();
    }
}

function validateStateUpdates(updates) {
    const validated = { ...updates };

    if ('harmonicL' in validated || 'harmonicM' in validated) {
        const newL = validated.harmonicL !== undefined ? validated.harmonicL : appState.harmonicL;
        const newM = validated.harmonicM !== undefined ? validated.harmonicM : appState.harmonicM;

        validated.harmonicM = Math.min(Math.abs(newM), newL);
        validated.harmonicL = Math.max(0, newL);
    }

    if ('functionParam' in validated) {
        validated.functionParam = Math.max(0.1, Math.min(10, validated.functionParam));
    }

    if ('pointSize' in validated) {
        validated.pointSize = Math.max(1, Math.min(20, validated.pointSize));
    }

    if ('rotationSpeed' in validated) {
        validated.rotationSpeed = Math.max(0.1, Math.min(3, validated.rotationSpeed));
    }

    if ('mode' in validated) {
        if (validated.mode === 'points') {
            console.warn('Points mode has been removed, defaulting to harmonics');
            validated.mode = 'harmonics';
        } else if (!['harmonics', 'function'].includes(validated.mode)) {
            validated.mode = 'harmonics';
        }
    }

    return validated;
}

function setAppState(newState) {
    updateState(newState);
}

function getAppState() {
    return { ...appState };
}

function syncStateToGUI() {
    if (!settings) {
        console.warn('Settings object not available for state sync');
        return;
    }

    try {
        settings.mode = appState.mode;
        settings.quadMethod = appState.quadMethod;
        settings.numPoints = appState.numPoints;
        settings.sphericalDesignType = appState.sphericalDesignType;
        settings.harmonicL = appState.harmonicL;
        settings.harmonicM = appState.harmonicM;
        settings.testFunction = appState.testFunction;
        settings.functionParam = appState.functionParam;
        settings.sphereDisplay = appState.sphereDisplay;
        settings.sphereOpacity = appState.sphereOpacity;
        settings.showPoints = appState.showPoints;
        settings.pointSize = appState.pointSize;
        settings.autoRotate = appState.autoRotate;
        settings.rotationSpeed = appState.rotationSpeed;

        if (gui) {
            gui.controllersRecursive().forEach(controller => {
                try {
                    controller.updateDisplay();
                } catch (error) {
                    console.warn('Failed to update controller display:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error syncing state to GUI:', error);
    }
}

syncWindowToState();
syncStateToWindow();

window.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT') return;

    switch (event.key) {
        case '1':
            setAppState({ mode: 'harmonics' });
            break;
        case '2':
            setAppState({ mode: 'function' });
            break;
        case ' ':
            event.preventDefault();
            setAppState({ autoRotate: !appState.autoRotate });
            break;
        case 'r':
        case 'R':
            if (controls) {
                controls.reset();
            }
            break;
    }
});

const stateChangeListeners = [];

function addStateChangeListener(callback) {
    stateChangeListeners.push(callback);
}

function removeStateChangeListener(callback) {
    const index = stateChangeListeners.indexOf(callback);
    if (index > -1) {
        stateChangeListeners.splice(index, 1);
    }
}

function notifyStateChange(oldState, newState) {
    stateChangeListeners.forEach(callback => {
        try {
            callback(newState, oldState);
        } catch (error) {
            console.error('State change listener error:', error);
        }
    });
}

window.addEventListener('load', async () => {
    try {
        await init();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});
window.addEventListener('resize', onWindowResize);

let gui;

const settings = {
    mode: appState.mode,
    quadMethod: appState.quadMethod,
    numPoints: appState.numPoints,
    sphericalDesignType: appState.sphericalDesignType,

    harmonicL: appState.harmonicL,
    harmonicM: appState.harmonicM,

    testFunction: appState.testFunction,
    functionParam: appState.functionParam,

    sphereDisplay: appState.sphereDisplay,
    sphereOpacity: appState.sphereOpacity,
    showPoints: appState.showPoints,
    pointSize: appState.pointSize,

    autoRotate: appState.autoRotate,
    rotationSpeed: appState.rotationSpeed,
};

function updateModeSpecificFolderVisibility(mode) {
    if (window.harmonicsFolder && window.functionsFolder) {
        const showHarmonics = mode === 'harmonics';
        const showFunctions = mode === 'function';

        window.harmonicsFolder.domElement.style.display = showHarmonics ? 'block' : 'none';
        window.functionsFolder.domElement.style.display = showFunctions ? 'block' : 'none';

        console.log(`Spherical Harmonics folder: ${showHarmonics ? 'shown' : 'hidden'}`);
        console.log(`Test Functions folder: ${showFunctions ? 'shown' : 'hidden'}`);
    }
}

function initializeGUI() {
    gui = new lilGui({ width: 350 });
    gui.title('3D Spherical Quadrature');

    const vizFolder = gui.addFolder('Visualization');
    vizFolder.add(settings, 'mode', {
        'Spherical Harmonics': 'harmonics',
        'Test Function': 'function'
    }).name('Mode').onChange(value => {
        updateState({ mode: value });
        updateModeSpecificFolderVisibility(value);
    });

    const quadFolder = gui.addFolder('Quadrature Method');
    quadFolder.add(settings, 'quadMethod', {
        'Monte Carlo (Uniform)': 'monte_carlo_uniform',
        'Monte Carlo (Clustered)': 'monte_carlo_clustered',
        'Lebedev': 'lebedev',
        'Product Quadrature': 'product',
        'HardinSloane': 'HardinSloane',
        'WomersleySym': 'WomersleySym',
        'WomersleyNonSym': 'WomersleyNonSym'
    }).name('Method').onChange(value => {
        updateState({ quadMethod: value });
    });

    quadFolder.add(settings, 'numPoints', 0, 10000, 1).name('Points').onChange(value => {
        updateState({ numPoints: value });
    });

    const harmonicsFolder = gui.addFolder('Spherical Harmonics');
    window.harmonicsFolder = harmonicsFolder;
    const lController = harmonicsFolder.add(settings, 'harmonicL', 0, 10, 1).name('ℓ (degree)').onChange(value => {
        const newM = Math.min(settings.harmonicM, value);
        updateState({ harmonicL: value, harmonicM: newM });

        mController.max(value);
        if (newM !== settings.harmonicM) {
            mController.updateDisplay();
        }
    });

    const mController = harmonicsFolder.add(settings, 'harmonicM', 0, 2, 1).name('m (order)').onChange(value => {
        updateState({ harmonicM: value });
    });

    const functionsFolder = gui.addFolder('Test Functions');
    window.functionsFolder = functionsFolder;
    functionsFolder.add(settings, 'testFunction', {
        'f₁: x² + y² + z²': 'f1',
        'f₂: x': 'f2',
        'f₃: x × y': 'f3',
        'f₄: exp(x + y + z)': 'f4',
        'f₅: cos(a × φ)': 'f5'
    }).name('Function').onChange(value => {
        updateState({ testFunction: value });
    });

    functionsFolder.add(settings, 'functionParam', 0.1, 10, 0.1).name('Parameter').onChange(value => {
        updateState({ functionParam: value });
    });

    const displayFolder = gui.addFolder('Display Options');

    displayFolder.add(settings, 'sphereDisplay', {
        'Wireframe': 'wireframe',
        'Color Map': 'colormap',
        'Solid': 'solid'
    }).name('Sphere Display').onChange(value => {
        updateState({ sphereDisplay: value });
    });

    displayFolder.add(settings, 'sphereOpacity', 0.0, 1.0, 0.1).name('Opacity').onChange(value => {
        updateState({ sphereOpacity: value });
    });

    displayFolder.add(settings, 'showPoints').name('Show Points').onChange(value => {
        updateState({ showPoints: value });
    });

    displayFolder.add(settings, 'pointSize', 1, 20, 1).name('Point Size').onChange(value => {
        updateState({ pointSize: value });
    });

    const animationFolder = gui.addFolder('Animation');
    animationFolder.add(settings, 'autoRotate').name('Auto Rotate').onChange(value => {
        updateState({ autoRotate: value });
    });

    animationFolder.add(settings, 'rotationSpeed', 0.1, 3, 0.1).name('Speed').onChange(value => {
        updateState({ rotationSpeed: value });
    });

    vizFolder.open();
    quadFolder.open();
    displayFolder.open();
    animationFolder.open();
    harmonicsFolder.open();
    functionsFolder.open();

    console.log('Syncing state to GUI...');
    syncStateToGUI();

    updateModeSpecificFolderVisibility(settings.mode);

    console.log('GUI initialization complete');
}




window.updateQuadraturePoints = updateQuadraturePoints;
window.triggerUpdate = triggerUpdate;
window.updateState = updateState;
window.setAppState = setAppState;
window.getAppState = getAppState;
window.syncStateToGUI = syncStateToGUI;
window.addStateChangeListener = addStateChangeListener;
window.removeStateChangeListener = removeStateChangeListener;
window.removeStateChangeListener = removeStateChangeListener;
window.removeStateChangeListener = removeStateChangeListener;
