import Plotly from 'plotly.js-dist-min';

import { prod_quad, generateProductQuadrature } from '../sphere-quadrature-module.ts';
import testFunctions from '../test-functions.ts';

type Trace = any;

const colors = {
    direct: '#E69F00', // prod_quad
    points: '#0072B2', // generateProductQuadrature
};

const config = {
    testFunction: 'f1',
    functionParam: 9,
    maxInternalN: 15, // internal Gauss-Legendre order for prod_quad; point count ≈ (2N+1)N
};

function resolveTestFunction() {
    const tf = (testFunctions as any[]).find(t => t.value === config.testFunction) || (testFunctions as any[])[0];
    return tf as { function: (phi: number, theta: number, a: number) => number; analyticalValue: (a: number) => number; name: string };
}

async function computeAndPlot() {
    const tf = resolveTestFunction();
    const a = config.functionParam;
    const Itrue = tf.analyticalValue(a);

    const xPoints: number[] = [];
    const errDirect: number[] = [];
    const errPoints: number[] = [];

    for (let N = 1; N <= config.maxInternalN; N++) {
        const M = 2 * N + 1;

        const Idir = prod_quad(tf.function, N, M, a);
        const eDir = Math.abs(Idir - Itrue);

        const desiredPoints = (2 * N + 1) * N;
        const pts = generateProductQuadrature(desiredPoints) as any[];
        let Ipts = 0;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i] as any;
            Ipts += p.weight * tf.function(p.phi, p.theta, a);
        }
        const ePts = Math.abs(Ipts - Itrue);

        xPoints.push(pts.length);
        errDirect.push(eDir);
        errPoints.push(ePts);
    }

    const traces: Trace[] = [
        {
            x: xPoints,
            y: errDirect,
            mode: 'lines+markers',
            name: 'prod_quad (direct)',
            line: { color: colors.direct, width: 3 },
            marker: { size: 7, symbol: 'diamond', color: colors.direct },
        },
        {
            x: xPoints,
            y: errPoints,
            mode: 'lines+markers',
            name: 'generateProductQuadrature (points)',
            line: { color: colors.points, width: 3 },
            marker: { size: 7, symbol: 'circle', color: colors.points },
        }
    ];

    const isLogScale = true;
    const layout: any = {
        xaxis: { title: { text: 'Number of Points (N)', font: { size: 14, color: '#2c3e50' } }, type: isLogScale ? 'log' : 'linear', gridcolor: '#e8e8e8', showgrid: true, zeroline: false, autorange: true },
        yaxis: { title: { text: `Integration Error [${config.testFunction.toUpperCase()}]`, font: { size: 14, color: '#2c3e50' } }, type: isLogScale ? 'log' : 'linear', gridcolor: '#e8e8e8', showgrid: true, zeroline: false, autorange: true, exponentformat: 'power' },
        plot_bgcolor: 'rgba(248, 249, 250, 0.8)',
        paper_bgcolor: 'transparent',
        font: { family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50' },
        legend: { xanchor: 'left', yanchor: 'bottom', x: 0.01, y: 0.02, bgcolor: 'rgba(255, 255, 255, 0.9)', bordercolor: '#ddd', borderwidth: 1, font: { size: 12 } },
        margin: { l: 60, r: 20, t: 20, b: 60 },
        hovermode: 'x unified',
        showlegend: true,
    };

    const plotConfig: any = { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'], toImageButtonOptions: { format: 'png', filename: 'mini_efficiency_prod', height: 600, width: 800 } };

    Plotly.newPlot('mini-efficiency-plot', traces, layout, plotConfig);
}

document.addEventListener('DOMContentLoaded', () => {
    computeAndPlot().catch(err => console.error('Mini efficiency plot failed:', err));
});


