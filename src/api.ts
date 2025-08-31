import express from 'express';
import cors from 'cors';

import {
    generateLebedevPoints,
    generateSphericalDesign,
    generateMonteCarloUniform,
    generateMonteCarloClustered,
    generateProductQuadrature,
} from './sphere-quadrature-module';

import testFunctions from './test-functions';
import { AVAILABLE_POINTS } from './constants';


const app = express();
app.use(cors());

const port = 3000;

const server = app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down...");
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down...");
    server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
});

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

function Integrate(func: (phi: number, theta: number, ...args: any[]) => number, points: Array<{ phi?: number | null; theta?: number | null; weight?: number | null }>, ...args: any[]): number {
    return points.reduce((sum, pt) => {
        return sum + func(pt.phi!, pt.theta!, ...args) * pt.weight!;
    }, 0);
}

app.get('/analysis', async (req, res) => {
    const maxPoints = Number(req.query.maxPoints) || 5780;
    const testFunction = String(req.query.testFunction) || 'f1';
    const functionParam = Number(req.query.functionParam) || 9;

    console.log(req)

    try {
        const analysisData: AnalysisData = {
            lebedev: { degrees: [], points: [], efficiencies: [], errors: [] },
            HardinSloane: { degrees: [], points: [], efficiencies: [], errors: [] },
            WomersleySym: { degrees: [], points: [], efficiencies: [], errors: [] },
            WomersleyNonSym: { degrees: [], points: [], efficiencies: [], errors: [] },
            product: { degrees: [], points: [], efficiencies: [], errors: [] },
            monteCarlo: { degrees: [], points: [], efficiencies: [], errors: [] },
            monteCarloClustered: { degrees: [], points: [], efficiencies: [], errors: [] },
        };

        const tf = testFunctions.find((t: any) => t.value === testFunction) || testFunctions[1];
        const analyticalVal = tf.analyticalValue(functionParam);

        // Compute Lebedev
        const lebedevEntries = Object.entries(AVAILABLE_POINTS.lebedev)
            .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
            .filter(({ points }) => points <= maxPoints)
            .sort((a, b) => a.points - b.points);

        for (const { points, degree } of lebedevEntries) {
            const efficiency = Math.min(1, ((degree + 1) * (degree + 1)) / (3 * points));
            analysisData.lebedev.degrees.push(degree);
            analysisData.lebedev.points.push(points);
            analysisData.lebedev.efficiencies.push(efficiency);

            const item = await generateLebedevPoints(points);
            const pts = item?.data ?? [];
            const approx = Integrate(tf.function, pts as any, functionParam);
            const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
            analysisData.lebedev.errors.push(error);
        }

        // Compute Spherical Designs
        const designFamilies = ['HardinSloane', 'WomersleySym', 'WomersleyNonSym'] as const;
        for (const fam of designFamilies) {
            const designMap = AVAILABLE_POINTS[fam] as Record<number, number>;
            const entries = Object.entries(designMap)
                .map(([pointsStr, degree]) => ({ points: Number(pointsStr), degree: Number(degree) }))
                .filter(({ points }) => points <= maxPoints)
                .sort((a, b) => a.points - b.points);

            for (const { points, degree } of entries) {
                const efficiency = Math.min(1, ((degree + 1) * (degree + 1)) / (3 * points));
                analysisData[fam].degrees.push(degree);
                analysisData[fam].points.push(points);
                analysisData[fam].efficiencies.push(efficiency);

                const item = await generateSphericalDesign(points, fam);
                const pts = item?.data ?? [];
                const approx = Integrate(tf.function, pts as any, functionParam);
                const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
                analysisData[fam].errors.push(error);
            }
        }

        // Compute Product quadrature
        for (let n = 1; n <= maxPoints; n *= 2) {
            const pts = generateProductQuadrature(n) as any[];
            const approx = Integrate(tf.function, pts as any, functionParam);
            const error = Math.max(Math.abs(approx - analyticalVal), 1e-16);
            analysisData.product.points.push(pts.length);
            analysisData.product.errors.push(error);
            analysisData.product.efficiencies.push(2 / 3);
            analysisData.product.degrees.push(Math.floor(Math.sqrt(2 * n) - 1));
        }

        // Compute Monte Carlo
        for (let n = 1; n <= maxPoints; n *= 2) {
            const ptsClustered = generateMonteCarloClustered(n) as any[];
            const approxClustered = Integrate(tf.function, ptsClustered as any, functionParam);
            const errorClustered = Math.max(Math.abs(approxClustered - analyticalVal), 1e-16);
            analysisData.monteCarloClustered.points.push(ptsClustered.length);
            analysisData.monteCarloClustered.errors.push(errorClustered);

            const ptsUniform = generateMonteCarloUniform(n) as any[];
            const approxUniform = Integrate(tf.function, ptsUniform as any, functionParam);
            const errorUniform = Math.max(Math.abs(approxUniform - analyticalVal), 1e-16);
            analysisData.monteCarlo.points.push(ptsUniform.length);
            analysisData.monteCarlo.errors.push(errorUniform);
        }

        console.log(`✅ Analysis complete for function ${testFunction} with param ${functionParam} up to ${maxPoints} points.`);

        res.json(analysisData);
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
