import Plotly from 'plotly.js-dist-min';

type AnalysisSeries = { degrees: number[]; points: number[]; efficiencies: number[]; errors: number[] };
type AnalysisData = {
    lebedev: AnalysisSeries;
    HardinSloane: AnalysisSeries;
    WomersleySym: AnalysisSeries;
    WomersleyNonSym: AnalysisSeries;
    product: AnalysisSeries;
    monteCarlo: AnalysisSeries;
    monteCarloClustered: AnalysisSeries;
};

type Colors = Record<string, string>;

export function updateEfficiencyPlot(analysisData: AnalysisData, colors: Colors) {
    const traces: any[] = [];

    const efficiencyPlotDiv = document.getElementById('efficiency-plot');
    if (efficiencyPlotDiv) {
        efficiencyPlotDiv.classList.remove('loading');
    }

    if (analysisData.lebedev.degrees.length > 0) {
        traces.push({
            x: analysisData.lebedev.degrees,
            y: analysisData.lebedev.efficiencies,
            mode: 'lines+markers',
            name: 'Lebedev',
            line: { color: colors.lebedev, width: 4, shape: 'linear' },
            marker: { size: 8 }
        });
    }

    if (analysisData.HardinSloane.degrees.length > 0) {
        traces.push({
            x: analysisData.HardinSloane.degrees,
            y: analysisData.HardinSloane.efficiencies,
            mode: 'lines+markers',
            name: 'Spherical Design (Hardin–Sloane)',
            line: { color: colors.hardinSloane, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.hardinSloane },
            visible: 'legendonly',
        });
    }

    if (analysisData.WomersleySym.degrees.length > 0) {
        traces.push({
            x: analysisData.WomersleySym.degrees,
            y: analysisData.WomersleySym.efficiencies,
            mode: 'lines+markers',
            name: 'Spherical Design (Womersley Sym)',
            line: { color: colors.womersleySym, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.womersleySym }
        });
    }

    if (analysisData.WomersleyNonSym.degrees.length > 0) {
        traces.push({
            x: analysisData.WomersleyNonSym.degrees,
            y: analysisData.WomersleyNonSym.efficiencies,
            mode: 'lines+markers',
            name: 'Spherical Design (Womersley NonSym)',
            line: { color: colors.womersleyNonSym, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.womersleyNonSym },
            visible: 'legendonly'
        });
    }

    if (analysisData.product.degrees.length > 0) {
        traces.push({
            x: analysisData.product.degrees,
            y: analysisData.product.efficiencies,
            mode: 'lines+markers',
            name: 'Gaussian Product',
            line: { color: colors.product, width: 4, shape: 'linear' },
            marker: { size: 6, color: colors.product }
        });
    }

    if (analysisData.monteCarlo.degrees.length > 0) {
        traces.push({
            x: analysisData.monteCarlo.degrees,
            y: analysisData.monteCarlo.efficiencies,
            mode: 'lines+markers',
            name: 'Monte Carlo',
            line: { color: colors.monteCarlo1, width: 4, shape: 'linear' },
            marker: { size: 6, color: colors.monteCarlo1 }
        });
    }

    if ((analysisData as any).monteCarloClustered && (analysisData as any).monteCarloClustered.degrees.length > 0) {
        const mc = (analysisData as any).monteCarloClustered as AnalysisSeries;
        traces.push({
            x: mc.degrees,
            y: mc.efficiencies,
            mode: 'lines+markers',
            name: 'Monte Carlo (Clustered)',
            line: { color: colors.monteCarlo2, width: 4, shape: 'linear' },
            marker: { size: 6, color: colors.monteCarlo2 }
        });
    }

    const layout: any = {
        xaxis: { title: { text: 'Polynomial Degree (p)', font: { size: 14, color: '#2c3e50' } }, gridcolor: '#e8e8e8', autorange: true, showgrid: false, zeroline: false },
        yaxis: { title: { text: 'Efficiency Factor (E)', font: { size: 14, color: '#2c3e50' } }, gridcolor: '#e8e8e8', range: [0, 1.1], showgrid: false, zeroline: false },
        plot_bgcolor: 'rgba(248, 249, 250, 0.8)',
        paper_bgcolor: 'transparent',
        font: { family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50' },
        legend: { xanchor: 'right', yanchor: 'bottom', x: 0.99, y: 0.02, bgcolor: 'rgba(255, 255, 255, 0.9)', bordercolor: '#ddd', borderwidth: 4, font: { size: 12 } },
        margin: { l: 60, r: 20, t: 20, b: 60 },
        hovermode: 'x unified',
        showlegend: true,
    };

    const plotConfig: any = { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'], toImageButtonOptions: { format: 'png', filename: 'efficiency_analysis', height: 600, width: 800,  } };

    Plotly.newPlot('efficiency-plot', traces, layout, plotConfig);
}

export function updateErrorPlot(analysisData: AnalysisData, colors: Colors, functionKey: string) {
    const traces: any[] = [];

    const errorPlotDiv = document.getElementById('error-plot');
    if (errorPlotDiv) {
        errorPlotDiv.classList.remove('loading');
    }

    if (analysisData.lebedev.points.length > 0 && analysisData.lebedev.errors.length > 0) {
        traces.push({
            x: analysisData.lebedev.points,
            y: analysisData.lebedev.errors,
            mode: 'lines+markers',
            name: 'Lebedev',
            line: { color: colors.lebedev, width: 4, shape: 'linear' },
            marker: { size: 8 }
        });
    }

    if (analysisData.HardinSloane.points.length > 0 && analysisData.HardinSloane.errors.length > 0) {
        traces.push({
            x: analysisData.HardinSloane.points,
            y: analysisData.HardinSloane.errors,
            mode: 'lines+markers',
            name: 'Spherical Design (Hardin–Sloane)',
            line: { color: colors.hardinSloane, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.hardinSloane },
            visible: 'legendonly',
        });
    }

    if (analysisData.WomersleySym.points.length > 0 && analysisData.WomersleySym.errors.length > 0) {
        traces.push({
            x: analysisData.WomersleySym.points,
            y: analysisData.WomersleySym.errors,
            mode: 'lines+markers',
            name: 'Spherical Design (Womersley Sym)',
            line: { color: colors.womersleySym, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.womersleySym },
        });
    }

    if (analysisData.WomersleyNonSym.points.length > 0 && analysisData.WomersleyNonSym.errors.length > 0) {
        traces.push({
            x: analysisData.WomersleyNonSym.points,
            y: analysisData.WomersleyNonSym.errors,
            mode: 'lines+markers',
            name: 'Spherical Design (Womersley NonSym)',
            line: { color: colors.womersleyNonSym, width: 4, shape: 'linear' },
            marker: { size: 8, color: colors.womersleyNonSym },
            visible: 'legendonly'
        });
    }

    if (analysisData.product.points.length > 0 && analysisData.product.errors.length > 0) {
        traces.push({
            x: analysisData.product.points,
            y: analysisData.product.errors,
            mode: 'lines+markers',
            name: 'Gaussian Product',
            line: { color: colors.product, width: 4, shape: 'linear' },
            marker: { size: 6 }
        });
    }

    if (analysisData.monteCarlo.points.length > 0 && analysisData.monteCarlo.errors.length > 0) {
        traces.push({
            x: analysisData.monteCarlo.points,
            y: analysisData.monteCarlo.errors,
            mode: 'lines+markers',
            name: 'Monte Carlo (Uniform)',
            line: { color: colors.monteCarlo1, width: 4, shape: 'linear' },
            marker: { size: 8 }
        });
    }

    if ((analysisData as any).monteCarloClustered && (analysisData as any).monteCarloClustered.points.length > 0 && (analysisData as any).monteCarloClustered.errors.length > 0) {
        const mc = (analysisData as any).monteCarloClustered as AnalysisSeries;
        traces.push({
            x: mc.points,
            y: mc.errors,
            mode: 'lines+markers',
            name: 'Monte Carlo (Clustered)',
            line: { color: colors.monteCarlo2, width: 4, shape: 'linear' },
            marker: { size: 8 }
        });
    }

    const layout: any = {
        xaxis: { title: { text: 'Number of Points (N)', font: { size: 14, color: '#2c3e50' } }, gridcolor: '#e8e8e8', type: 'log', showgrid: false, zeroline: false, autorange: true },
        yaxis: { title: { text: `Integration Error [${functionKey.toUpperCase()}]`, font: { size: 14, color: '#2c3e50' } }, gridcolor: '#e8e8e8', type: 'log', showgrid: false, zeroline: false, exponentformat: 'power', autorange: true },
        plot_bgcolor: 'rgba(248, 249, 250, 0.8)',
        paper_bgcolor: 'transparent',
        font: { family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#2c3e50' },
        legend: { xanchor: 'left', yanchor: 'bottom', x: 0.01, y: 0.02, bgcolor: 'rgba(255, 255, 255, 0.9)', bordercolor: '#ddd', borderwidth: 4, font: { size: 12 } },
        margin: { l: 60, r: 20, t: 20, b: 60 },
        hovermode: 'x unified',
        showlegend: true,
    };

    const plotConfig: any = { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'], toImageButtonOptions: { format: 'png', filename: 'error_analysis', height: 600, width: 800 } };

    Plotly.newPlot('error-plot', traces, layout, plotConfig);
}
