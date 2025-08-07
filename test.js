import { prod_quad, gaussLegendre, trapezoidal } from "./sphere-quadrature-module.js";

function x(phi, theta) {
    return Math.sin(phi) * Math.cos(theta);
}
function y(phi, theta) {
    return Math.sin(phi) * Math.sin(theta);
}
function z(phi, theta) {
    return Math.cos(phi);
}

// Test function f_1
function f_1(p, t, a = 1) {
    return (
        1
        + x(p, t)
        + Math.pow(y(p, t), 2)
        + Math.pow(x(p, t), 2) * y(p, t)
        + Math.pow(x(p, t), 4)
        + Math.pow(y(p, t), 5)
        + Math.pow(x(p, t), 2) * Math.pow(y(p, t), 2) * Math.pow(z(p, t), 2)
    );
}
const f_1_exact = 216 * Math.PI / 35 / (4 * Math.PI);


console.log("result", prod_quad(f_1), f_1_exact);