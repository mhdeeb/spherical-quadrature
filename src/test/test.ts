import { prod_quad, generateProductQuadrature } from "../sphere-quadrature-module.ts";
import testFunctions from "../test-functions.ts";

let N = 10;

let analytical = prod_quad(testFunctions[0].function, N, 2 * N + 1);

let points = generateProductQuadrature(2 * N * N);
let sum = 0;

for (let point of points) {
    sum += testFunctions[0].function(point.phi, point.theta) * point.weight;
}

console.log(Math.abs(sum - analytical));
