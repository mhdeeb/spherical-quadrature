import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import lilGui from 'lil-gui';

import {
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
    generateLebedevPoints,
    generateSphericalDesign,
    prod_quad,
} from './sphere-quadrature-module.ts';

import testFunctions from './test-functions.ts';

import { SPHERE_RADIUS } from './constants.ts';
import type { NumericRange } from './cache-types.ts';

type QuadPoint = { x?: number | null; y?: number | null; z?: number | null; weight?: number | null; phi?: number | null; theta?: number | null };

type QuadMethod = 'monte_carlo_uniform' | 'monte_carlo_clustered' | 'lebedev' | 'product' | 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';
type SphereDisplay = 'wireframe' | 'colormap' | 'solid';

// Single source of truth for default app values
const DEFAULTS = {
    quadMethod: 'product' as QuadMethod,
    numPoints: 1600,
    testFunction: () => testFunctions[0],
    functionParam: 1.0,
    sphereDisplay: 'solid' as SphereDisplay,
    sphereOpacity: 1,
    showPoints: true,
    autoRotate: true,
    rotationSpeed: 0.5,
};

interface AppState {
    quadMethod: QuadMethod;
    numPoints: number;
    testFunction: any;
    functionParam: number;
    sphereDisplay: SphereDisplay;
    sphereOpacity: number;
    showPoints: boolean;
    autoRotate: boolean;
    rotationSpeed: number;
}

declare global {
    interface Window {
        currentQuadMethod: 'monte_carlo_uniform' | 'monte_carlo_clustered' | 'lebedev' | 'product' | 'HardinSloane' | 'WomersleySym' | 'WomersleyNonSym';
        numPoints: number;
        currentTestFunction: any;
        functionParam: number;
        showSphere: boolean;
        showPoints: boolean;
        showColorMap: boolean;
        wireframe: boolean;

        sphereOpaque: boolean;
        autoRotate: boolean;
        rotationSpeed: number;
        sphereDisplay: 'wireframe' | 'colormap' | 'solid';
        sphereOpacity: number;
        forcePointRecreation?: boolean;
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

// Window-level state will be initialized from app state via syncStateToWindow()

let quadraturePoints: QuadPoint[] = [];
let currentWeightRange: NumericRange | null = null;

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 3);

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
        color: 'white',
        transparent: true,
        opacity: 1,
        wireframe: window.wireframe
    });

    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereGroup.add(sphereMesh);
}

function updateQuadratureVisualization(forceRecreate = false) {
    const existingPointCount = pointGroup.children.length;
    const hasCorrectPointCount = existingPointCount === quadraturePoints.length;

    if (!hasCorrectPointCount || forceRecreate) {
        pointGroup.clear();

        if (window.showPoints && quadraturePoints.length > 0) {
            const Npoints = Math.max(1, quadraturePoints.length);
            const spacing = Math.sqrt(4 * Math.PI / Npoints);
            const pointRadius = Math.max(0.002, Math.min(0.04, 0.35 * spacing));
            const pointGeometry = new THREE.SphereGeometry(pointRadius, 16, 12);

            // Use cached weight range when available; otherwise compute from points
            const fallbackWeight = 1 / quadraturePoints.length;
            let minWeight: number;
            let maxWeight: number;
            if (currentWeightRange && isFinite(currentWeightRange.min) && isFinite(currentWeightRange.max)) {
                minWeight = currentWeightRange.min;
                maxWeight = currentWeightRange.max;
            } else {
                let localMin = Number.POSITIVE_INFINITY;
                let localMax = Number.NEGATIVE_INFINITY;
                for (const p of quadraturePoints) {
                    const w = (p.weight ?? fallbackWeight) as number;
                    if (w < localMin) localMin = w;
                    if (w > localMax) localMax = w;
                }
                if (!isFinite(localMin) || !isFinite(localMax)) {
                    localMin = fallbackWeight;
                    localMax = fallbackWeight;
                }
                minWeight = localMin;
                maxWeight = localMax;
            }

            const lowColor = new THREE.Color(0x1e90ff);   // low weights → blue
            const highColor = new THREE.Color(0xff4500);  // high weights → orange-red

            quadraturePoints.forEach(point => {
                const px = (point.x ?? 0) as number;
                const py = (point.y ?? 0) as number;
                const pz = (point.z ?? 0) as number;

                // Assign color based on weight
                const w = (point.weight ?? fallbackWeight) as number;
                const t = maxWeight > minWeight ? (w - minWeight) / (maxWeight - minWeight) : 0.5;
                const color = lowColor.clone().lerp(highColor, Math.max(0, Math.min(1, t)));
                // Use per-mesh material to color individually
                const material = new THREE.MeshLambertMaterial({ color });
                const pointMesh = new THREE.Mesh(pointGeometry, material);
                pointMesh.userData.originalRadius = pointRadius;
                pointMesh.position.set(px, py, pz);

                // Size by weight: scale around base radius
                const weightScale = 0.6 + 0.8 * t; // [0.6, 1.4]
                pointMesh.userData.weightScale = weightScale;
                pointMesh.scale.setScalar(weightScale);

                pointGroup.add(pointMesh);
            });
        }
    } else {
        pointGroup.visible = window.showPoints;

        if (window.showPoints) {
            const Npoints = Math.max(1, quadraturePoints.length);
            const spacing = Math.sqrt(4 * Math.PI / Npoints);
            const newPointRadius = Math.max(0.002, Math.min(0.04, 0.35 * spacing));
            pointGroup.children.forEach(pointMesh => {
                const originalRadius = pointMesh.userData.originalRadius || 0.06;
                const weightScale = pointMesh.userData.weightScale ?? 1;
                const scaleFactor = (newPointRadius / originalRadius) * weightScale;
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

    let maxVal = 0;
    let minVal = 0;

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        const r = Math.sqrt(x * x + y * y + z * z);
        const phi = Math.acos(Math.max(-1, Math.min(1, z / r)));
        const theta = Math.atan2(y, x);
        const funcValue = window.currentTestFunction.function(phi, theta, window.functionParam);

        maxVal = Math.max(maxVal, funcValue);
        minVal = Math.min(minVal, funcValue);
    }

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        const r = Math.sqrt(x * x + y * y + z * z);
        const phi = Math.acos(Math.max(-1, Math.min(1, z / r)));
        const theta = Math.atan2(y, x);

        let colorValue;


        try {
            const funcValue = window.currentTestFunction.function(phi, theta, window.functionParam);
            colorValue = Math.max(0, Math.min(1, (funcValue - minVal) / (maxVal - minVal)));
        } catch (e) {
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

// Removed spherical harmonics utilities

function getEffectiveNumPointsFromState(state: typeof appState) {
    const desired = state.numPoints || 1;
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

    content += `<div class="info-row"><span class="info-label">Mode:</span> 📈 Function Integration</div>`;

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



    content += `<div class="info-section">`;
    content += `<div class="info-header">📈 Test Function</div>`;
    const tfName = window.currentTestFunction.name;
    const tfDesc = window.currentTestFunction.description;
    content += `<div class="info-row"><span class="info-label">Function:</span> ${tfName}</div>`;
    if (tfDesc) {
        content += `<div class="info-row"><span class="info-label">Details:</span> <span class="info-detail">${tfDesc}</span></div>`;
    }
    content += `<div class="info-row"><span class="info-label">Parameter:</span> ${window.functionParam.toFixed(3)}</div>`;
    content += `</div>`;


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
        const N = quadraturePoints.length;

        for (let i = 0; i < N; i++) {
            const point = quadraturePoints[i];
            const funcValue = window.currentTestFunction.function(point.phi, point.theta, window.functionParam);
            const weight = point.weight ?? 1 / N;
            numericalValue += funcValue * weight;
        }

        analyticalValue = window.currentTestFunction.analyticalValue(window.functionParam);

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
        await updateQuadraturePoints();
        updateQuadratureVisualization(window.forcePointRecreation || false);
        updateSurfaceVisualization();
        updateSphereAppearance();
        needsInfoPanelUpdate = true;
        needsUpdate = false;
        window.forcePointRecreation = false;
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
    const calculationPoints = getEffectiveNumPoints();

    let points: QuadPoint[] | null = null;

    try {
        switch (window.currentQuadMethod) {
            case 'monte_carlo_uniform':
                points = generateMonteCarloUniform(calculationPoints);
                currentWeightRange = { min: 1 / calculationPoints, max: 1 / calculationPoints };
                break;
            case 'monte_carlo_clustered':
                points = generateMonteCarloClustered(calculationPoints);
                // Weights are sin(phi)/N, so range is approximately [0, 1/N]
                currentWeightRange = { min: 0, max: 1 / calculationPoints };
                break;
            case 'lebedev':
                {
                    const item = await generateLebedevPoints(calculationPoints);
                    points = item?.data ?? null;
                    currentWeightRange = item?.weightRange ?? null;
                }
                break;
            case 'product':
                points = generateProductQuadrature(calculationPoints);
                // Compute exact min/max once since not cached
                if (points && points.length > 0) {
                    let minW = Number.POSITIVE_INFINITY;
                    let maxW = Number.NEGATIVE_INFINITY;
                    for (const p of points) {
                        const w = (p.weight ?? 0) as number;
                        if (w < minW) minW = w;
                        if (w > maxW) maxW = w;
                    }
                    currentWeightRange = { min: minW, max: maxW };
                } else {
                    currentWeightRange = null;
                }
                break;
            case 'HardinSloane':
            case 'WomersleySym':
            case 'WomersleyNonSym':
                {
                    const item = await generateSphericalDesign(calculationPoints, window.currentQuadMethod);
                    points = item?.data ?? null;
                    currentWeightRange = item?.weightRange ?? null;
                }
                break;
            default:
                console.warn(`Unknown quadrature method: ${window.currentQuadMethod}, using Monte Carlo uniform`);
                points = generateMonteCarloUniform(calculationPoints);
                currentWeightRange = { min: 1 / calculationPoints, max: 1 / calculationPoints };
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
    quadMethod: DEFAULTS.quadMethod,
    numPoints: DEFAULTS.numPoints,

    testFunction: DEFAULTS.testFunction(),
    functionParam: DEFAULTS.functionParam,

    sphereDisplay: DEFAULTS.sphereDisplay,
    sphereOpacity: DEFAULTS.sphereOpacity,
    showPoints: DEFAULTS.showPoints,

    autoRotate: DEFAULTS.autoRotate,
    rotationSpeed: DEFAULTS.rotationSpeed
};

function syncStateToWindow() {
    window.currentQuadMethod = appState.quadMethod;
    window.numPoints = appState.numPoints;
    window.currentTestFunction = appState.testFunction;
    window.functionParam = appState.functionParam;
    window.sphereDisplay = appState.sphereDisplay;
    window.sphereOpacity = appState.sphereOpacity;
    window.showPoints = appState.showPoints;


    window.showSphere = appState.sphereDisplay !== 'wireframe' ? true : true;
    window.wireframe = appState.sphereDisplay === 'wireframe';
    window.showColorMap = appState.sphereDisplay === 'colormap';
    window.sphereOpaque = appState.sphereOpacity >= 1.0;
    window.autoRotate = appState.autoRotate;
    window.rotationSpeed = appState.rotationSpeed;
}

function syncWindowToState() {
    if (window.currentQuadMethod) appState.quadMethod = window.currentQuadMethod as QuadMethod;
    if (typeof window.numPoints === 'number') appState.numPoints = window.numPoints;
    if (window.currentTestFunction) {
        const candidate = window.currentTestFunction as any;
        if (typeof candidate === 'string') {
            const matched = (testFunctions as any[]).find(tf => tf.value === candidate);
            if (matched) {
                appState.testFunction = matched as any;
            }
        } else {
            appState.testFunction = candidate as any;
        }
    }
    if (typeof window.functionParam === 'number') appState.functionParam = window.functionParam;
    if (window.sphereDisplay) appState.sphereDisplay = window.sphereDisplay as SphereDisplay;
    if (typeof window.sphereOpacity === 'number') appState.sphereOpacity = window.sphereOpacity;
    if (typeof window.showPoints === 'boolean') appState.showPoints = window.showPoints;

    if (typeof window.autoRotate === 'boolean') appState.autoRotate = window.autoRotate;
    if (typeof window.rotationSpeed === 'number') appState.rotationSpeed = window.rotationSpeed;
}

const QUADRATURE_AFFECTING_PROPERTIES = [
    'quadMethod', 'numPoints',
    'testFunction', 'functionParam'
];

const INFO_PANEL_AFFECTING_PROPERTIES = [
    'quadMethod', 'numPoints',
    'testFunction', 'functionParam'
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
            oldState.testFunction !== appState.testFunction ||
            oldState.functionParam !== appState.functionParam;

        if (actuallyNeedsRegeneration) {
            triggerUpdate(true);
        }
    } else {
        updateQuadratureVisualization();
        updateSurfaceVisualization();
        updateSphereAppearance();
    }
}

function validateStateUpdates(updates: Partial<AppState>) {
    const validated: Partial<AppState> = { ...updates };

    // Removed spherical harmonics constraints

    if ('functionParam' in validated && typeof validated.functionParam === 'number') {
        validated.functionParam = Math.max(0.1, Math.min(10, validated.functionParam));
    }



    if ('rotationSpeed' in validated && typeof validated.rotationSpeed === 'number') {
        validated.rotationSpeed = Math.max(0.1, Math.min(3, validated.rotationSpeed));
    }

    // Removed mode switching (harmonics removed)

    // Normalize testFunction input: accept string ids from GUI and map to full object
    if ('testFunction' in validated) {
        const incoming: any = (validated as any).testFunction;
        if (typeof incoming === 'string') {
            const matched = (testFunctions as any[]).find(tf => tf.value === incoming);
            if (matched) {
                (validated as any).testFunction = matched;
            } else {
                delete (validated as any).testFunction; // ignore invalid ids
            }
        } else if (!incoming || typeof incoming.function !== 'function') {
            (validated as any).testFunction = appState.testFunction;
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
        settings.quadMethod = appState.quadMethod;
        settings.numPoints = appState.numPoints;
        settings.testFunction = (appState.testFunction as any)?.value;
        settings.functionParam = appState.functionParam;
        settings.sphereDisplay = appState.sphereDisplay;
        settings.sphereOpacity = appState.sphereOpacity;
        settings.showPoints = appState.showPoints;

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
    quadMethod: appState.quadMethod,
    numPoints: appState.numPoints,

    testFunction: (appState.testFunction as any)?.value,
    functionParam: appState.functionParam,

    sphereDisplay: appState.sphereDisplay,
    sphereOpacity: appState.sphereOpacity,
    showPoints: appState.showPoints,

    autoRotate: appState.autoRotate,
    rotationSpeed: appState.rotationSpeed,
};

function updateModeSpecificFolderVisibility(_mode: 'harmonics' | 'function') {
    if (window.functionsFolder) {
        window.functionsFolder.domElement.style.display = 'block';
    }
}

function initializeGUI() {
    gui = new lilGui({ width: 350 });
    gui.title('3D Spherical Quadrature');

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

    // Removed spherical harmonics controls

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
        .onChange((value: string) => {
            updateState({ testFunction: value as any });
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

    // Removed manual point size control; automatic scaling is used instead

    const animationFolder = gui.addFolder('Animation');
    animationFolder.add(settings, 'autoRotate').name('Auto Rotate').onChange((value: boolean) => {
        updateState({ autoRotate: value });
    });

    animationFolder.add(settings, 'rotationSpeed', 0.1, 3, 0.1).name('Speed').onChange((value: number) => {
        updateState({ rotationSpeed: value });
    });

    displayFolder.open();
    animationFolder.open();
    functionsFolder.open();

    syncStateToGUI();

    updateModeSpecificFolderVisibility('function');

}




window.updateQuadraturePoints = updateQuadraturePoints;
window.triggerUpdate = triggerUpdate;
window.updateState = updateState;
window.setAppState = setAppState;
window.getAppState = getAppState;
window.syncStateToGUI = syncStateToGUI;
window.addStateChangeListener = addStateChangeListener;
window.removeStateChangeListener = removeStateChangeListener;
