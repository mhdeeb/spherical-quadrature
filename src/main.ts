import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import lilGui from 'lil-gui';

import {
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
    generateLebedevPoints,
    generateSphericalDesign,
} from './sphere-quadrature-module.ts';

import testFunctions from './test-functions.ts';

import { SPHERE_RADIUS } from './constants.ts';

type QuadPoint = { x?: number | null; y?: number | null; z?: number | null; weight?: number | null; phi?: number | null; theta?: number | null };

type Mode = 'harmonics' | 'function';
type QuadMethod = 'monte_carlo_uniform' | 'monte_carlo_clustered' | 'lebedev' | 'product' | 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';
type TestFunctionKey = 'f1' | 'f2' | 'f3' | 'f4' | 'f5';
type SphereDisplay = 'wireframe' | 'colormap' | 'solid';

interface AppState {
    mode: Mode;
    quadMethod: QuadMethod;
    numPoints: number;
    harmonicL: number;
    harmonicM: number;
    testFunction: TestFunctionKey;
    functionParam: number;
    sphereDisplay: SphereDisplay;
    sphereOpacity: number;
    showPoints: boolean;
    pointSize: number;
    autoRotate: boolean;
    rotationSpeed: number;
}

declare global {
    interface Window {
        currentMode: 'harmonics' | 'function';
        currentQuadMethod: 'monte_carlo_uniform' | 'monte_carlo_clustered' | 'lebedev' | 'product' | 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';
        numPoints: number;
        harmonicL: number;
        harmonicM: number;
        currentTestFunction: 'f1' | 'f2' | 'f3' | 'f4' | 'f5';
        functionParam: number;
        showSphere: boolean;
        showPoints: boolean;
        showColorMap: boolean;
        wireframe: boolean;
        pointSize: number;
        sphereOpaque: boolean;
        autoRotate: boolean;
        rotationSpeed: number;
        sphereDisplay: 'wireframe' | 'colormap' | 'solid';
        sphereOpacity: number;
        forcePointRecreation?: boolean;
        harmonicsFolder?: any;
        functionsFolder?: any;
        updateQuadraturePoints?: () => Promise<void>;
        triggerUpdate?: (force?: boolean) => void;
        updateState?: (updates: Partial<typeof appState>) => void;
        setAppState?: (newState: Partial<typeof appState>) => void;
        getAppState?: () => typeof appState;
        syncStateToGUI?: () => void;
        addStateChangeListener?: (cb: (newState: any, oldState: any) => void) => void;
        removeStateChangeListener?: (cb: (newState: any, oldState: any) => void) => void;
    }
}

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
let sphereGroup: THREE.Group, pointGroup: THREE.Group, surfaceGroup: THREE.Group;

let sphereGeometry: THREE.SphereGeometry, sphereMaterial: THREE.MeshLambertMaterial, sphereMesh: THREE.Mesh;

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

let quadraturePoints: QuadPoint[] = [];

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
    if (container) {
        container.appendChild(renderer.domElement);
    }

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

    sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 32);

    sphereMaterial = new THREE.MeshLambertMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.3,
        wireframe: window.wireframe
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
                const px = (point.x ?? 0) as number;
                const py = (point.y ?? 0) as number;
                const pz = (point.z ?? 0) as number;
                pointMesh.position.set(px, py, pz);
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
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS * 1.005, resolution, resolution / 2);
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
                const ylm = computeSphericalHarmonic(window.harmonicL, window.harmonicM, theta, phi);
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

function getSphericalHarmonicDisplayName(l: number, m: number) {
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

function getEffectiveNumPointsFromState(state: typeof appState) {
    const desired = state.numPoints || 100;
    const minPoints = Math.max(1, desired);
    const maxPoints = Math.min(10000, minPoints);
    return maxPoints;
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
        const tfEntry = Object.fromEntries(testFunctions.map((t: any) => [t.value, t]))[window.currentTestFunction];
        const tfName = tfEntry?.name ?? window.currentTestFunction;
        const tfDesc = tfEntry?.description ?? '';
        content += `<div class="info-row"><span class="info-label">Function:</span> ${tfName}</div>`;
        if (tfDesc) {
            content += `<div class="info-row"><span class="info-label">Details:</span> <span class="info-detail">${tfDesc}</span></div>`;
        }
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
    let analyticalValue: number | null = null;

    try {
        if (window.currentMode === 'function') {
            let sumWeighted = 0;
            let sumWeights = 0;
            const N = quadraturePoints.length;

            for (let i = 0; i < N; i++) {
                const point = quadraturePoints[i];
                const xVal = point.x ?? 0;
                const yVal = point.y ?? 0;
                const zVal = point.z ?? 0;
                const denom = Math.sqrt(xVal * xVal + yVal * yVal + zVal * zVal) || 1;
                const phi = point.phi != null ? point.phi : Math.acos(Math.max(-1, Math.min(1, zVal / denom)));
                const theta = point.theta != null ? point.theta : Math.atan2(yVal, xVal);
                const funcValue = evaluateTestFunction(window.currentTestFunction, phi, theta, window.functionParam);
                const weight = point.weight ?? 1 / N;
                if (window.currentQuadMethod === 'lebedev' || window.currentQuadMethod === 'product') {
                    numericalValue += funcValue * weight;
                } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                    // Clustered MC uses non-uniform sampling; use provided weights for weighted average
                    sumWeighted += funcValue * weight;
                    sumWeights += weight;
                } else {
                    // Uniform MC and spherical designs → simple average
                    sumWeighted += funcValue;
                    sumWeights += 1;
                }
            }

            if (window.currentQuadMethod === 'lebedev' || window.currentQuadMethod === 'product') {
                numericalValue = numericalValue / (4 * Math.PI);
            } else {
                numericalValue = sumWeighted / (sumWeights || 1);
            }

            analyticalValue = getAnalyticalValue(window.currentTestFunction, window.functionParam);
            if (analyticalValue !== null) {
                analyticalValue = analyticalValue / (4 * Math.PI);
            }
        } else if (window.currentMode === 'harmonics') {
            let sumWeighted = 0;
            let sumWeights = 0;
            const N = quadraturePoints.length;

            for (let i = 0; i < N; i++) {
                const point = quadraturePoints[i];
                const xVal2 = point.x ?? 0;
                const yVal2 = point.y ?? 0;
                const zVal2 = point.z ?? 0;
                const denom2 = Math.sqrt(xVal2 * xVal2 + yVal2 * yVal2 + zVal2 * zVal2) || 1;
                const phi2 = point.phi != null ? point.phi : Math.acos(Math.max(-1, Math.min(1, zVal2 / denom2)));
                const theta2 = point.theta != null ? point.theta : Math.atan2(yVal2, xVal2);
                const ylm = computeSphericalHarmonic(window.harmonicL, window.harmonicM, theta2, phi2);
                const weight = point.weight ?? 1 / N;
                if (window.currentQuadMethod === 'lebedev' || window.currentQuadMethod === 'product') {
                    numericalValue += ylm * weight;
                } else if (window.currentQuadMethod === 'monte_carlo_clustered') {
                    sumWeighted += ylm * weight;
                    sumWeights += weight;
                } else {
                    sumWeighted += ylm;
                    sumWeights += 1;
                }
            }

            if (window.currentQuadMethod === 'lebedev' || window.currentQuadMethod === 'product') {
                numericalValue = numericalValue / (4 * Math.PI);
            } else {
                numericalValue = sumWeighted / (sumWeights || 1);
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
        const msg = (error instanceof Error) ? error.message : String(error);
        content += `<div class="info-row error-message">Integration Error: ${msg}</div>`;
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

            const mat = sphereMesh.material as THREE.MeshLambertMaterial;
            mat.wireframe = (window.sphereDisplay === 'wireframe');
            mat.transparent = window.sphereOpacity < 1.0;
            mat.opacity = window.sphereOpacity;
        }

        (sphereMesh.material as THREE.Material).needsUpdate = true;
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

    let points: QuadPoint[] | null = null;

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

        quadraturePoints = (points ?? []).map(p => ({
            x: p.x ?? 0,
            y: p.y ?? 0,
            z: p.z ?? 0,
            weight: p.weight ?? undefined,
            phi: p.phi ?? undefined,
            theta: p.theta ?? undefined,
        }));
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

const appState: AppState = {
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

    window.showSphere = appState.sphereDisplay !== 'wireframe' ? true : true;
    window.wireframe = appState.sphereDisplay === 'wireframe';
    window.showColorMap = appState.sphereDisplay === 'colormap';
    window.sphereOpaque = appState.sphereOpacity >= 1.0;
    window.autoRotate = appState.autoRotate;
    window.rotationSpeed = appState.rotationSpeed;
}

function syncWindowToState() {
    if (window.currentMode) appState.mode = window.currentMode as Mode;
    if (window.currentQuadMethod) appState.quadMethod = window.currentQuadMethod as QuadMethod;
    if (typeof window.numPoints === 'number') appState.numPoints = window.numPoints;
    if (typeof window.harmonicL === 'number') appState.harmonicL = window.harmonicL;
    if (typeof window.harmonicM === 'number') appState.harmonicM = window.harmonicM;
    if (window.currentTestFunction) appState.testFunction = window.currentTestFunction as TestFunctionKey;
    if (typeof window.functionParam === 'number') appState.functionParam = window.functionParam;
    if (window.sphereDisplay) appState.sphereDisplay = window.sphereDisplay as SphereDisplay;
    if (typeof window.sphereOpacity === 'number') appState.sphereOpacity = window.sphereOpacity;
    if (typeof window.showPoints === 'boolean') appState.showPoints = window.showPoints;
    if (typeof window.pointSize === 'number') appState.pointSize = window.pointSize;
    if (typeof window.autoRotate === 'boolean') appState.autoRotate = window.autoRotate;
    if (typeof window.rotationSpeed === 'number') appState.rotationSpeed = window.rotationSpeed;
}

const QUADRATURE_AFFECTING_PROPERTIES = [
    'mode', 'quadMethod', 'numPoints',
    'harmonicL', 'harmonicM', 'testFunction', 'functionParam'
];

const INFO_PANEL_AFFECTING_PROPERTIES = [
    'quadMethod', 'numPoints',
    'mode', 'harmonicL', 'harmonicM', 'testFunction', 'functionParam'
];

function updateState(updates: Partial<typeof appState>) {
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

function validateStateUpdates(updates: Partial<AppState>) {
    const validated: Partial<AppState> = { ...updates };

    if ('harmonicL' in validated || 'harmonicM' in validated) {
        const newL = validated.harmonicL !== undefined ? validated.harmonicL : appState.harmonicL;
        const newM = validated.harmonicM !== undefined ? validated.harmonicM : appState.harmonicM;

        validated.harmonicM = Math.min(Math.abs(newM), newL);
        validated.harmonicL = Math.max(0, newL);
    }

    if ('functionParam' in validated && typeof validated.functionParam === 'number') {
        validated.functionParam = Math.max(0.1, Math.min(10, validated.functionParam));
    }

    if ('pointSize' in validated && typeof validated.pointSize === 'number') {
        validated.pointSize = Math.max(1, Math.min(20, validated.pointSize));
    }

    if ('rotationSpeed' in validated && typeof validated.rotationSpeed === 'number') {
        validated.rotationSpeed = Math.max(0.1, Math.min(3, validated.rotationSpeed));
    }

    if ('mode' in validated) {
        if (validated.mode !== 'harmonics' && validated.mode !== 'function') {
            validated.mode = 'harmonics';
        }
    }

    return validated;
}

function setAppState(newState: Partial<typeof appState>) {
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
            gui.controllersRecursive().forEach((controller: any) => {
                try {
                    controller.updateDisplay();
                } catch (error) {
                    console.warn('Failed to update controller display:', error as any);
                }
            });
        }
    } catch (error) {
        console.error('Error syncing state to GUI:', error as any);
    }
}

syncWindowToState();
syncStateToWindow();

window.addEventListener('keydown', (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'INPUT') return;

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

const stateChangeListeners: Array<(newState: typeof appState, oldState: typeof appState) => void> = [];

function addStateChangeListener(callback: (newState: typeof appState, oldState: typeof appState) => void) {
    stateChangeListeners.push(callback);
}

function removeStateChangeListener(callback: (newState: typeof appState, oldState: typeof appState) => void) {
    const index = stateChangeListeners.indexOf(callback);
    if (index > -1) {
        stateChangeListeners.splice(index, 1);
    }
}

function notifyStateChange(oldState: typeof appState, newState: typeof appState) {
    stateChangeListeners.forEach(callback => {
        try {
            callback(newState, oldState);
        } catch (error) {
            console.error('State change listener error:', error as any);
        }
    });
}

window.addEventListener('load', async () => {
    try {
        await init();
    } catch (error) {
        console.error('Failed to initialize application:', error as any);
    }
});
window.addEventListener('resize', onWindowResize);

let gui: any;

const settings: any = {
    mode: appState.mode,
    quadMethod: appState.quadMethod,
    numPoints: appState.numPoints,

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

function updateModeSpecificFolderVisibility(mode: 'harmonics' | 'function') {
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
    }).name('Mode').onChange((value: 'harmonics' | 'function') => {
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
    }).name('Method').onChange((value: Window['currentQuadMethod']) => {
        updateState({ quadMethod: value });
    });

    quadFolder.add(settings, 'numPoints', 0, 10000, 1).name('Points').onChange((value: number) => {
        updateState({ numPoints: value });
    });

    const harmonicsFolder = gui.addFolder('Spherical Harmonics');
    window.harmonicsFolder = harmonicsFolder;
    harmonicsFolder.add(settings, 'harmonicL', 0, 10, 1).name('ℓ (degree)').onChange((value: number) => {
        const newM = Math.min(settings.harmonicM, value);
        updateState({ harmonicL: value, harmonicM: newM });

        mController.max(value);
        if (newM !== settings.harmonicM) {
            mController.updateDisplay();
        }
    });

    const mController = harmonicsFolder.add(settings, 'harmonicM', 0, 2, 1).name('m (order)').onChange((value: number) => {
        updateState({ harmonicM: value });
    });

    const functionsFolder = gui.addFolder('Test Functions');
    window.functionsFolder = functionsFolder;

    // Build function options dynamically from testFunctions
    const toSubscript = (num: number) => {
        const sub = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return String(num).split('').map(d => sub[parseInt(d, 10)]).join('');
    };
    const functionOptions: Record<string, string> = {};
    testFunctions.forEach((tf: any, idx: number) => {
        const label = `f${toSubscript(idx + 1)}: ${tf.name}`;
        functionOptions[label] = tf.value;
    });

    functionsFolder
        .add(settings, 'testFunction', functionOptions)
        .name('Function')
        .onChange((value: Window['currentTestFunction']) => {
            updateState({ testFunction: value });
        });

    functionsFolder.add(settings, 'functionParam', 0.1, 10, 0.1).name('Parameter').onChange((value: number) => {
        updateState({ functionParam: value });
    });

    const displayFolder = gui.addFolder('Display Options');

    displayFolder.add(settings, 'sphereDisplay', {
        'Wireframe': 'wireframe',
        'Color Map': 'colormap',
        'Solid': 'solid'
    }).name('Sphere Display').onChange((value: Window['sphereDisplay']) => {
        updateState({ sphereDisplay: value });
    });

    displayFolder.add(settings, 'sphereOpacity', 0.0, 1.0, 0.1).name('Opacity').onChange((value: number) => {
        updateState({ sphereOpacity: value });
    });

    displayFolder.add(settings, 'showPoints').name('Show Points').onChange((value: boolean) => {
        updateState({ showPoints: value });
    });

    displayFolder.add(settings, 'pointSize', 1, 20, 1).name('Point Size').onChange((value: number) => {
        updateState({ pointSize: value });
    });

    const animationFolder = gui.addFolder('Animation');
    animationFolder.add(settings, 'autoRotate').name('Auto Rotate').onChange((value: boolean) => {
        updateState({ autoRotate: value });
    });

    animationFolder.add(settings, 'rotationSpeed', 0.1, 3, 0.1).name('Speed').onChange((value: number) => {
        updateState({ rotationSpeed: value });
    });

    vizFolder.open();
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
