#import "/templates/latex.typ": *
#import "@preview/subpar:0.2.2"


#show: article
#set page(margin: (
  top: 3cm,
  bottom: 2cm,
  x: 2.5cm,
))
#set math.equation(numbering: "(1)")


#maketitle(
  title: "Thesis: ",
  authors: (
    "Mohamed Hussien El-Deeb (201900052)",
  ),
  date: false,
)


#tableofcontents()

#align(center)[
  #text(17pt, strong[Abstract])
]
#v(1em) // Add some vertical space

Numerical integration over spherical surfaces is a fundamental problem in numerous scientific and engineering disciplines, yet it is often intractable analytically. This thesis presents a comprehensive investigation and comparison of prominent quadrature schemes for the unit sphere. We examine two major classes of methods: Gaussian quadratures, including the straightforward Product-of-One-Dimensional rule and the highly efficient Lebedev scheme, and Chebyshev quadratures, represented by deterministic Spherical t-designs and the non-deterministic Monte Carlo method.

This thesis is a comprehensive study and analysis of leading quadrature techniques for the unit sphere. We discuss two general classes of methods: Gaussian quadratures like the straightforward Product-of-One-Dimensional rule and the highly efficient Lebedev scheme, and Chebyshev quadratures, as represented by deterministic Spherical t-designs and the non-deterministic Monte Carlo method.

The results reveal a clear trade-off between peak efficiency and robust performance. For smooth integrands, the Lebedev and Spherical Design schemes demonstrate superior efficiency, achieving high accuracy with significantly fewer nodes than other methods. However, their performance can be highly sensitive to the integrand's properties; for discontinuous functions, their accuracy becomes erratic and depends critically on the placement of nodes relative to the discontinuities. The Gaussian Product rule, while theoretically less efficient, proves to be a more robust and predictable alternative. The Monte Carlo method, as expected, exhibits the slowest convergence, serving as a baseline for comparison. The study concludes that the optimal choice of a quadrature scheme is contingent upon the nature of the integrand, requiring a careful balance between the demand for computational efficiency and the need for numerical stability.

*Keywords:* Numerical Integration, Quadrature, Sphere, Spherical Harmonics, Gaussian Quadrature, Lebedev Quadrature, Chebyshev Quadrature, Spherical Designs, Monte Carlo Method, Numerical Analysis.

#pagebreak()

= Introduction

////////////////////////////// Motivation //////////////////////////////////////

Numerous physical problems, such as those associated with the Earth's climate, magnetic fields, or gravitational potential, require integrating over a spherical surface, yet analytical solutions are almost never possible because of the complicated functions involved, as well as the sphere’s non-Euclidean geometry. In geophysics, for example, scientists gather discrete data, like the surface temperature or the magnetic field intensity, from different locations on the Earth’s surface to estimate a global average or construct models of some large-scale processes. Because these data points are often sparsely measured, they need to be numerically integrated over the spherical surface to calculate some meaningful quantities, for instance, total heat flux or geomagnetic energy, since no closed-form solutions are usually available. This leads directly to the idea of _quadrature on a spherical surface_, which is the approximation of the integral of a function over a sphere by the sum of its values at specially chosen points, using specially chosen weights which take into account the curvature of the sphere.

// - quadrature in 1D history 
// - extension to higher dimensions
// - points distribution problem

//////////////////////////// Historical Background ////////////////////////

In mathematics, _quadrature_ refers to the process of computing an area, traditionally sometimes by making a square with equal area. The word quadrature came from the Latin word _quadratus_, which means a square. In modern mathematics, the term has been extended to include _numerical quadrature_, which is the numerical approximating of definite integrals. Quadrature has a long history and has many developments over time, and reflects the history of changing perspectives around mathematics and mathematical methods #cite(<History>), #cite(<History_intro>).

In ancient Greece, quadrature was a central problem, encompassing both the quadrature of the circle—one of the three classical geometric challenges (alongside doubling the cube and trisecting an angle)—and early forms of one-dimensional (1D) quadrature, which involved finding the area under a curve. The quadrature of the circle aimed to construct a square with the same area as a given circle using only a compass and straightedge. Early mathematicians like Hippocrates of Chios (c. 470–410 BCE) made progress by squaring the lune, a crescent-shaped region, showing that certain curved areas could be equated to rectilinear ones. Archimedes and Eudoxus advanced these efforts with the method of exhaustion, approximating areas by inscribing and circumscribing polygons or summing rectangular strips under curves, such as parabolas, effectively pioneering 1D quadrature as a precursor to integration. However, the reliance on compass-and-straightedge constructions, deemed "pure" by philosophers like Plato, limited solutions to problems like the circle’s quadrature #cite(<History>), #cite(<History_intro>) #cite(<History_greek>).

In the medieval era, Islamic mathematicians preserved and developed Greek mathematical ideas. Mathematicians such as _Al-Khwārizmī_ and _Ibn al-Haytham_ were interested in quadratures of certain areas, such as parabolic segments, and other curves, and took a blend of geometric and algebraic approaches to tackle these problems. Their analysis, and work, contributed to the Renaissance re-examination of classical problems stimulating European mathematics. Later, in the early modern period, _Johannes Kepler_ used quadrature for astronomy related calculations involving the areas of planets swept out by their orbits; _Bonaventura Cavalieri_ formulated a method utilizing indivisibles, which recast areas as the sum of a series of infinitely thin strips. _René Descartes_ and _Pierre de Fermat_ developed the ideas associated with analytic geometry that further normalized a move toward quadrature with algebraic representation, which provided a pathway to calculus #cite(<History>), #cite(<History_intro>).

The development of calculus by _Isaac Newton_ and _Gottfried Wilhelm Leibniz_ in the 17th century was a real game-changer for quadrature. The definite integral gave a systematic way of computing areas under curves. The definite integral generalized quadrature through antiderivatives and the Fundamental Theorem of Calculus. By the 19th century, the classical quadrature of the circle had been proven impossible with compass and straightedge, following _Ferdinand von Lindemann_'s proof in 1882 that π was transcendental. On the other hand, _Carl Friedrich Gauss_ illustrated _Gaussian quadrature_ as a way of numerically integrating that approximates integrals using optimally chosen points and weights, and is an essential mathematical computation staple #cite(<History>), #cite(<History_intro>).


////////////////////////////// problem statement ////////////////////////////

As mathematical problems grew more complex, quadrature extended to higher dimensions, including two-dimensional (2D) and three-dimensional (3D) domains, like spheres. However, the problem of numerical quadrature over a sphere involves approximating the integral of a function $f(x)$ over the unit sphere $S^2$, represented as $integral_(S^2) f(x) d S$, by using a finite set of points $\{x_i\}$ and weights $\{w_i\}$ so that $sum_{i=1}^N w_i f(x_i)$ is accurate. The goal is to make it exact for polynomials or spherical harmonics up to a certain degree. This requires effective point distributions that consider the sphere’s curvature and symmetry while keeping computational costs low. Some schemes for this include Gaussian quadrature and Chebyshev quadrature, which will be discussed in detail in this thesis.


///////////////////////////////// thesis aim /////////////////////////////

This thesis aims to investigate, compare, and analyze Gaussian and Chebyshev quadrature schemes for integration over spherical surfaces, highlighting their theoretical underpinnings and practical performance. The subsequent sections will detail the theoretical foundations, specific quadrature methods, numerical results, and practical implementation aspects.

= Theoretical Foundations

== Definition of Quadrature

A numerical quadrature scheme approximates an integral over a domain by a weighted sum over a finite collection of points ${x_i} subset {S}^2$:
$
I[f] equiv integral_(S^2) f(x) d Omega approx sum_(i=0)^(N-1) w_i f(x_i) equiv Q[f],
$
where $w_i$ are the weights and $Q[f]$ is the quadrature of the exact integral #cite(<main>).

//////////////////////////////

A quadrature, in numerical analysis, refers to the numerical approximation of a definite integral. Mathematically, a quadrature rule transforms the continuous problem of integration into a discrete sum #cite(<Dahlquist_Björck_book>).

Given a definite integral of a function f(x) over an interval [a,b]:

$ I[f]= integral_a^b f(x) d x $

A numerical quadrature rule approximates this integral as a weighted sum of function values at specific points within the domain of integration. The general mathematical form of a quadrature rule is #cite(<main>), #cite(<Dahlquist_Björck_book>):

$ Q[f]= sum_(i=0)^(N−1) w_i f(x_i) $ <equ_weighted_sum>
Where:
- *$Q[f]$* is the approximation of the integral.
- *$N$* is the number of evaluation points, also known as nodes or abscissas.
- *$x_i$* are the integration points, or nodes, where the function f(x) is evaluated.
- *$w_i$* are the corresponding weights assigned to each function value.


For a sphere, specifically the unit sphere $S^2 = {x in RR^3 : ||x||^2 = 1}$, the integral of a function $f(x)$ over its surface is typically expressed in spherical coordinates $(phi, theta)$ as:

$ 
  I[f] equiv integral_(S^2) f(x) d Omega = integral_0^(2 pi) integral_0^pi f(phi, theta) sin(phi) d phi d theta 
$ <equ_sphere_integral>

A numerical quadrature rule for this integral on the unit sphere takes the same form of a weighted sum in #ref(<equ_weighted_sum>, form: "normal"), but with the evaluation points $x_i ("or" (phi_i, theta_i))$ lying on the spherical surface.

The goal of numerical quadrature is to select the nodes ($x_i$) and weights ($w_i$) such that the approximation Q[f] is as accurate as possible for a given number of points N, ideally achieving a specified level of precision with the fewest possible function evaluations #cite(<main>), #cite(<Dahlquist_Björck_book>).

== Spherical Harmonics

Building upon the concept of numerical quadrature, it is crucial to understand the nature of the functions being integrated, especially when dealing with complex domains such as the unit sphere. This is where _Spherical Harmonics_ emerge as a fundamental concept, serving as the natural basis for analyzing functions defined on a spherical surface and, consequently, for designing and evaluating the effectiveness of quadrature rules #cite(<main>), #cite(<CubedSphere>), #cite(<lebedev>).

Spherical harmonics, denoted as $Y_l^m (theta,phi)$, are the angular part of the solutions to Laplace's equation in spherical coordinates. They are functions of two angular variables:

- $theta$: the polar angle or colatitude, ranging from 0 to $pi$ (from the North Pole to the South Pole).
- $phi$: the azimuthal angle or longitude, ranging from 0 to $2pi$.
The general form of a complex spherical harmonic is given by:

$ 
  Y_l^m (theta,phi) = sqrt((2l+1)/(4 pi) ((l -|m|)!)/((l+|m|)!)) P_l^(|m|) (cos(theta)) e^(i m phi)
$

Where:

- $l$ is the degree (or angular momentum quantum number), a non-negative integer ($l=0,1,2,…$). It determines the angular frequency of the function and the overall "shape" or complexity.
- $m$ is the order (or magnetic quantum number), an integer ranging from $−l$ to $l$ (i.e., $m in {−l,−l+1,…,0,…,l−1,l}$). It determines the behavior along the azimuthal direction.
- $P_l^(|m|) (cos(theta))$ are the Associated Legendre Polynomials, which depend on the polar angle $theta$.
- $e^(i m phi)$ is the complex exponential term, which depends on the azimuthal angle $phi$.
- The square root term is a normalization constant, ensuring that the spherical harmonics are orthonormal over the unit sphere.

For their following properties, the spherical harmonics are chosen to be the basis for the problem of _Quadrature on a unit sphere_:
+ *Completeness:* The set of spherical harmonics ${Y_l^m}_(l>=0, -l<=m<=l)$ forms a complete orthonormal basis for the Hilbert space $L^2(SS^2)$, the space of square-integrable complex-valued functions on the unit sphere. This means that any $f in L^2(SS^2)$ can be uniquely expanded as a linear combination (a series) of spherical harmonics:
  $ 
    f(theta, phi) = sum_(l=0)^infinity sum_(m=-l)^l c_l^m Y_l^m (theta, phi)
  $ <equ_spherical_completeness>
  where the coefficients $c_l^m = integral_(SS^2) f(theta, phi) (Y_l^m (theta, phi))^* d Omega$.
+ *Orthogonality:* For any integers $l, l'>=0$ and $m,m'$ such that $-l <=m<=l$ and $-l' <=m'<=l'$, they satisfy the orthogonality condition:
  $
    integral_(SS^2) Y_l^m (theta, phi) (Y_l'^m' (theta, phi))^* d Omega = delta_(l l') delta_(m m')
  $
  where $(Y_l'^m')^*$ denotes the complex conjugate, and $delta$ is the Kronecker delta. This property significantly simplifies the analysis of functions on the sphere, allowing for unique decomposition and coefficient determination via projection.
+ *Symmetry Properties:* Spherical harmonics possess various symmetry properties, including:
  - *Parity:* $Y_l^m (-r) = (-1)^l Y_l^m (r)$, meaning their parity depends on the degree $l$.
  - *Rotational symmetry:* Spherical harmonics of a fixed degree $l$, ${Y_l^m}_(m=-l)^l$, form an irreducible representation of the three-dimensional rotation group SO(3). This implies that under any rotation of the sphere, linear combinations of spherical harmonics of the same degree $l$ transform into other linear combinations of spherical harmonics of the same degree $l$.

== Efficiency of Quadrature

In computational physics and applied mathematics, minimizing computational cost while maintaining accuracy is paramount. Therefore, the efficiency of a numerical quadrature rule on the sphere is a key metric. It quantifies how effectively a rule uses a given number of points (N) to achieve a certain level of accuracy. A rule is considered more efficient if it can attain a higher degree of exactness with fewer quadrature points #cite(<main>), #cite(<McLaren>).

The efficiency of a spherical quadrature rule is directly linked to its algebraic degree of exactness, which is defined as the highest degree p of spherical harmonics that the rule can integrate exactly.

*The McLaren Efficiency Formula*

The *McLaren efficiency *formula provides a simple, yet powerful, way to analyze the relationship between the number of points and the degree of exactness. For a quadrature rule on the unit sphere with N points and an algebraic degree of exactness p, the efficiency E is defined as #cite(<McLaren>):

$
  E = "Number of functions integrated exactly"/"Number of degrees of freedom in the rule"
$


*Number of Exactly Integrated Functions:*\
The functions that the quadrature rule must integrate exactly are the spherical harmonics up to degree $p$. The dimension of the space of spherical harmonics of degree $l$, ${Y_l^m}_(m=-l)^l$, is $(2l+1)$. Therefore, the total number of linearly independent spherical harmonics up to degree $p$ is the sum of the dimensions for each degree from $l=0$ to $p$:

$
  L &= sum_(l=0)^p (2l+1) \
  &= 2 sum_(l=0)^p l + sum_(l=0)^p 1  \
  &= 2((p (p+1))/2) + (p + 1) \
  &= p(p + 1) + (p + 1)
  = (p + 1)^2
$

*Number of Degrees of Freedom:*\
A general quadrature rule with $N$ points has $N$ independent weights, $w_i$, and $N$ independent point locations, $x_i$. Each point location on the sphere is specified by two coordinates (e.g., longitude and latitude, or two Cartesian coordinates if the third is a dependent variable). Therefore, the total number of free parameters or degrees of freedom in the rule is:
- Number of weights: $N$
- Number of point coordinates: $2N$
- Total degrees of freedom: $N+2N=3N$

*The Efficiency Formula:*\
Combining these two quantities, the McLaren Efficiency (E) is
$
  E = (p + 1)^2/(3N)
$ <equ_McLaren>

= Quadrature Schemes on Sphere

In developing a quadrature scheme, we can choose both the positions of the nodes ${x_i}$ and the corresponding weights ${w_i}$. However, many quadrature methods can be constructed by fixing the weights, eliminating the need to compute them alongside the nodes. When all weights are set to be equal, the resulting schemes are called *Chebyshev quadratures*. In contrast, when both nodes and weights are determined together to optimize the approximation, the schemes are referred to as *Gauss quadratures* #cite(<main>).

== Gaussian quadrature
=== Product-of-One-Dimensional Quadratures
One of the most straightforward methods for constructing a quadrature rule for the unit sphere is to leverage existing one-dimensional quadrature formulas. This approach, often referred to as a product-of-one-dimensional quadratures, reformulates the two-dimensional integral over the sphere into a product of two one-dimensional integrals using spherical coordinates #cite(<main>), #cite(<Gauss-Legendre>).

The integral of a function $f(theta, phi)$ over the unit sphere is given by #ref(<equ_sphere_integral>).
The product of one dimensional quadratures approximates this integral by applying separate one-dimensional rules to the polar ($theta$) and azimuthal ($phi$) components.

The method typically combines two distinct one-dimensional rules #cite(<main>):
- *Azimuthal Quadrature:* The integral with respect to $phi$ over $[0,2pi]$ is periodic. An $N_phi$-point quadrature rule is used, often based on evenly spaced points to exploit this periodicity. For a rule that is exact for trigonometric polynomials up to degree $p_phi$, we use $N_phi$ points, and the quadrature nodes and weights are:
  - Nodes: $phi_j = (2 pi j)/N_phi$ for $j = 0, 1, ..., N_phi -1$
  - Weights: $w_(phi, j) = 2 pi/N_phi$
  In this study, we will use the *trapezoidal scheme*.
- *Polar Quadrature:* The integral with respect to $theta$ over $[0,pi]$ includes a weight function, $sin(theta)$. This form is ideally suited for *Gauss-Legendre quadrature* (see #link(<appendixA>)[Appendix A]), which is known to be exact for polynomials up to a high degree. An $N_theta$-point Gauss-Legendre rule is exact for polynomials up to degree $2N_theta − 1$. The nodes $theta_i$ and weights $w_(theta,i)$ are determined by the roots and weights of the Legendre polynomials, $P_(N_theta) (x)$, on the interval $[−1,1]$ after a change of variable. \
  Let $x=cos(theta)$, so $d x = − sin(theta) d theta$. The integral becomes:

  $
    integral_(-1)^1 g(x) d x
  $

  where $g(x) = f(arccos(x), phi)$. The Gauss-Legendre nodes $x_i$ and weights $w'_i$ are determined such that the rule is exact for polynomials up to degree $2N_theta - 1$. The corresponding polar nodes are $theta_i = arccos (x_i)$ and the weights are $w_(theta, i) = w'_i$.

Combining these, a product-Gauss quadrature rule with a total of $N = N_theta X N_phi$ points is given by:

$
  Q[f] = sum_(i=1)^(N_theta) sum_(j=1)^(N_phi) w_i f(theta_i, phi_i) 
$

where the weights are $w_(i,j) = w_(theta, i) times w_(phi, j) = w'_i times (2 pi)/N_phi$.

*Efficiency Analysis*\
The efficiency of this rule can be analyzed using the McLaren formula (#ref(<equ_McLaren>)). To achieve an algebraic degree of exactness $p$, the number of points must be sufficient to integrate all spherical harmonics up to degree $p$ exactly. A product-Gauss rule with $N_theta$ and $N_phi$ points has a degree of exactness $p = min(2 N_theta - 1, N_phi - 1)$. For typical constructions where $N_phi approx p + 1$ and $N_theta approx [(p+1)/2]$, the total number of points is $N approx (p+1)^2/2$.

Substituting this into the McLaren efficiency formula yields:

$
  E = (p+1)^2/(3N) approx (p+1)^2/(3(p+1)^2/2) = 2/3
$

This analysis shows that product-Gauss quadratures for the sphere, while easy to construct, have a theoretical efficiency of approximately 2/3 #cite(<main>). 
// This is significantly lower than more advanced, non-product rules like Lebedev quadratures, which exploit the sphere's full rotational symmetry to achieve efficiencies approaching the theoretical maximum of 1.

Another downside of this scheme is that the not equal distance spacing between the points, and the highly-concentrated points around the poles, as shown in (#ref(<fig_gauss_pro>)), could cause issues for dynamical problems due to numerical instability.
// meow //////////

=== Lebedev Quadratures

The Lebedev quadrature method represents an efficient technique for numerical integration on the unit sphere that differs from product-of-one-dimensional methods. Instead of building the rule from polar and azimuthal parts, the Lebedev rule is built as a whole collection of points and weights that takes advantage of the globe's full symmetry about its center point, which provides a much higher level of exactness for the number of points being used, thus higher efficiency #cite(<main>), #cite(<CubedSphere>), #cite(<lebedev>).

// The key to Lebedev quadrature is its use of a specific, highly symmetric arrangement of points on the sphere. These point sets are invariant under the octahedral rotation group with inversion, a finite subgroup of the rotation group SO(3). This means that if a point $x$ is in a Lebedev grid, all points that can be reached by rotating $x$ by a symmetry operation of the octahedron are also in the grid. This symmetric structure simplifies the problem of determining the weights and nodes, as many of them become identical due to symmetry.

The nodes and weights of a Lebedev rule are determined by enforcing that the rule integrates all spherical harmonics up to a certain degree p exactly. This is achieved by solving a system of linear equations where the unknown variables are the weights and the coordinates of the nodes:

$
  sum_(i =1)^N w_i Y_l^m (x_i) = integral_(SS^2) Y_l^m (x) d Omega = 4 pi delta_(l 0) delta_(m 0)
$

This condition states that the integral is non-zero only for the constant function ($Y_0^0$), which integrates to the surface area of the sphere ($4pi$). The challenge is that this leads to a potentially large system of non-linear equations, which is difficult to solve in general. To overcome this, _Lebedev_ and _Sobolev_ introduced the concept of rotational invariance #cite(<main>), #cite(<CubedSphere>), #cite(<lebedev>).

A key principle is established by Sobolev's Theorem, which states:\
"Let $Q$ be a quadrature scheme invariant under the group $G$. Then, $Q$ is exact for all functions $f in Pi^p$ if and only if $Q$ is exact for all functions $f in Pi^p_G$."

Here, $Pi^p$ is the set of all spherical harmonics up to degree p, and $Pi^p_G$ is the subset of those functions that are also invariant under the group G. This theorem dramatically simplifies the problem by reducing the number of non-linear equations that must be solved, as it is only necessary to enforce exact integration on the smaller set of invariant spherical harmonics.

Lebedev applied this principle by constructing quadrature rules that are invariant under the octahedral rotation group with inversion ($O_h$). This use of symmetry allows for the creation of rules that achieve a high degree of exactness with a minimal number of points #cite(<main>). An example of a Lebedev grid shows a more uniform distribution of points compared to a Gaussian product grid (#ref(<fig_lebedev>)).

#subpar.grid(
  figure(image("image (1).png", width: 103%), 
  caption: [
    Gaussian product grid with $N = 1596$
  ]), <fig_gauss_pro>,
  figure(image("image (9).png"), 
  caption: [
    Lebedev product grid with $N = 974$
  ]), <fig_lebedev>,
  columns: (3fr, 3fr),
  caption: [Distribution of nodes for Gauss quadratures #cite(<demo>).],
  label: <fig_gauss_dist>,
)

The main advantage of Lebedev quadrature is its exceptional efficiency. While a product-Gauss rule has a maximum efficiency of approximately 2/3, Lebedev rules, by optimally placing points, can achieve efficiencies that are very close to the theoretical maximum of 1. For a Lebedev rule of the same degree $p$, the number of points N is significantly smaller, often leading to $N<(p+1)^2$
 , resulting in a higher efficiency. For many Lebedev grids, the number of points $N$ is close to the minimum required for a given degree of exactness. These performance comparisons are to be shown on the next sections using some test functions.

== Chebyshev quadrature

Chebyshev quadratures are a type of numerical integration rule designed with a specific constraint: all weights are equal. This simplification significantly reduces the number of free parameters from $3N$ to $2N$, as it is only needed to determine the optimal node locations. This makes them computationally efficient, especially for problems where the function is expensive to evaluate #cite(<main>), #cite(<CubedSphere>).

The goal of a Chebyshev quadrature rule is to find $N$ nodes $x_i$, such that for a given weight function $w(x)$, the approximation of the integral is:

$
  I[f] = integral_(SS^2) f(x) w(x) d Omega approx Q[f] = C sum_(i=1)^N f(x_i)
$

Here, the weight $w_i = C$ for all $i = 1, ..., N$. The constant $C$ is determined by the condition
that the rule is exact for the constant function ($f(x) = 1$). In this case, the sum of the weights
must equal the total integral of the weight function:

$
  integral_(SS^2) 1 dot w(x) d Omega = C sum_(i=1)^N 1 \
  4 pi = N C \
  therefore
  C = (4 pi)/N
$

The key question then becomes: how should the nodes ${x_i}$ be placed on $SS^2$
  to ensure accurate integration for a broad class of functions? Ideally, the nodes should be “uniformly” distributed over the sphere, but defining and constructing such distributions is nontrivial. Two main approaches are widely used: *spherical designs*, which are deterministic and highly structured, and *Monte Carlo* sampling, which is random #cite(<main>).


=== Uniform distribution of points on a sphere "Spherical designs"

A spherical t-design is a specific type of Chebyshev quadrature. It is defined as a set of N points on the sphere such that an equal-weight quadrature rule is exact for all spherical polynomials up to degree t #cite(<main>). The existence of such a point set is guaranteed for any t and sufficiently large N. The defining equation for a spherical t-design is:

$
  integral_(SS^2) f(x) d Omega = (4 pi)/N sum_(i=0)^(N-1) f(x_i)
$
This condition must hold for all spherical polynomials $p(x)$ of degree at most $t$. This is a moment-matching condition, ensuring that the average of the polynomial over the point set equals its average over the entire sphere.

The derivation involves finding nodes that satisfy a set of moment-matching conditions. Since any $f(x)$ on the sphere could be represented by a linear combination of he spherical harmonics (#ref(<equ_spherical_completeness>)) .The rule must be exact for a set of basis functions, which, in the context of the sphere, are the spherical harmonics. The conditions are:
$
  sum_(i=1)^N (4 pi)/N Y^m_l (x_i) = integral_(SS^2) Y^m_l (x) d Omega
$

The integral on the right-hand side could be evaluated by the orthonormality condition:

$
  integral_(SS^2) Y^m_l (x) Y^m'_l' (x) d Omega = delta_(l l') delta_(m m') \
  integral_(SS^2) Y^m_l (x) Y^0_0 (x) d Omega = delta_(l 0) delta_(m 0) \
  integral_(SS^2) Y^m_l (x) 1/sqrt(4 pi) d Omega = delta_(l 0) delta_(m 0) \
  therefore 
  integral_(SS^2) Y^m_l (x) d Omega 
  := cases(
  0 quad "if" m ", " l eq.not 0,
  sqrt(4 pi) quad "if" m = l = 0
)
$

Therefore, the condition simplifies to:
$
  sum_(i=1)^N Y^m_l (x_i) = 0 quad "for"  t>=l>=1
$

This system of equations must be solved to find the node locations $x_i$. The difficulty lies in solving this non-linear system, and solutions only exist for specific values of $N$ and degrees of exactness.

The efficiency of spherical designs is exceptionally high due to their inherent optimality and a specific design principle that minimizes redundancy. As a class of equal-weight quadratures, they only have to determine the positions of the nodes, reducing the number of degrees of freedom to 2N (two coordinates per point) instead of the 3N required for a general quadrature rule.

The efficiency is measured by the ratio of the number of exactly integrated functions to the number of degrees of freedom, as defined by the McLaren efficiency formula, which can be adapted for equal-weight rules:

$
  E= (t+1)^2/(2N) 
$
 
Spherical designs are highly efficient because for a given degree of exactness t, they are known to have a minimal number of points N. This minimal number is bounded by the *Delsarte bound*, which states that $N ≥ 1/2(t+1)(t+2)$. By achieving this minimum or a number very close to it, spherical designs push the efficiency value as high as possible.

This makes them superior to other non-symmetric or unequal-weight rules that require a greater number of points to achieve the same degree of accuracy. The high efficiency of these designs is a direct result of their elegant geometric structure and the mathematical principles that govern their construction #cite(<main>).

#figure(
  image("image (5).png", width: 40%),
  caption: [Spherical t-design quadrature with $N = 222$ #cite(<demo>).]
)

=== Random distribution of points on a sphere "Monte Carlo"

Beyond the structured approaches of Chebyshev quadratures, Monte Carlo integration offers a probabilistic method for numerical integration on the unit sphere. This approach leverages random sampling to approximate definite integrals, offering a distinct methodology particularly advantageous in scenarios where deterministic methods encounter computational intractability due to high dimensionality or irregular integrands.

Unlike methods that rely on pre-determined, fixed nodes and weights, Monte Carlo integration approximates the integral by generating a large number of randomly distributed points within the domain of integration #cite(<main>). For a function $f(x)$ defined on the unit sphere $SS^2$, its integral is approximated as:

$
  I[f] = integral_(SS^2) f(vec(x)) d Omega approx Q[f] = V dot 1/N sum_(i=1)^N f(x_i)
$

For the unit sphere, $V = 4pi$, so the quadrature rule is:

$
  Q[f] = (4 pi)/N sum_(i=1)^N f(x_i)
$
The error of this approximation is probabilistic. By the Central Limit Theorem, the error is approximately normally distributed with a standard deviation that scales with the standard deviation of the function itself, of, and the number of sample points, N:

$
  "Error" approx (V sigma_f)/sqrt(N)
$

where the variance of the function is $sigma^2_f = E[f^2] - (E[f])^2$. This gives the well-known convergence rate of $O(N^(-1/2))$, which is generally slower than deterministic methods for low-dimensional problems but advantageous in higher dimensions.

The crucial difference lies in how the nodes ${x_i}$ are generated to be truly uniform over the sphere. A naive approach is to sample the spherical coordinates ($theta,phi$) from uniform distributions on $[0,2pi]$ and $[0,pi]$ respectively. However, this leads to a clustering of points near the poles because the area element $d Omega=sin(phi) d phi d theta$ is smaller near the poles, as illustrated in #ref(<fig_monte_clustered>) #cite(<main>).

To generate a truly uniform distribution on the sphere's surface, a change of variables is required. We can generate θ uniformly on [0,2π] and a second variable u uniformly on $[−1,1]$. By setting $phi=arccos(u)$, we achieve a uniform distribution of points. This is because the probability density function for φ becomes proportional to $sin(phi)$, which exactly cancels the sin(φ) term in the area element, ensuring that any small area on the sphere is equally likely to contain a sample point (#ref(<fig_monte_uniform>)) #cite(<main>).

#subpar.grid(
  figure(image("image (3).png", width: 103%), 
  caption: [
    Clustered Monte Carlo with $N = 1600$
  ]), <fig_monte_clustered>,
  figure(image("image (4).png"), 
  caption: [
    Uniform Monte Carlo with $N = 1600$
  ]), <fig_monte_uniform>,
  columns: (3fr, 3fr),
  caption: [Distribution of nodes for Monte Carlo quadrature #cite(<demo>).]
)


///////////////////////////////////////// Kitten's section  ////////////////////////////////
= Numerical Performance Analysis
Following the theoretical exposition of Gaussian and Chebyshev quadrature schemes, this section transitions to an empirical evaluation of their practical performance. The objective is to move beyond theoretical efficiency and assess how these methods behave when applied to a variety of functions on the unit sphere. The analysis framework involves applying the different quadrature rules to a set of standardized test functions and measuring their accuracy as a function of the number of quadrature points (N). This approach allows for a direct comparison of their convergence rates and practical utility.

The primary schemes under comparison are:

- *Gaussian Product Quadrature:* A straightforward method constructed from one-dimensional Gauss-Legendre and trapezoidal rules.

- *Lebedev Quadrature:* A highly efficient Gaussian-type scheme that utilizes rotationally invariant point sets derived from the octahedral group.

- *Spherical t-designs:* A Chebyshev-type quadrature that employs an optimal, deterministic distribution of points with equal weights.

- *Monte Carlo Method:* A non-deterministic, equal-weight Chebyshev-type quadrature using randomly generated points.

The performance of each scheme is quantified by computing the relative error for each test function, defined as:

$
  e[f] = abs((I[f] - Q[f])/(I[f]))
$

where $I[f]$ is the known analytical value of the integral and $Q[f]$ is the numerical approximation generated by the quadrature rule. By plotting this error against the number of nodes, $N$, we can visually inspect the convergence characteristics of each method.

*Test Functions*

To probe the strengths and weaknesses of the quadrature schemes, a set of test functions with diverse mathematical properties is used. These functions are chosen based on their varying degrees of smoothness and symmetry, characteristics known to significantly influence the performance of numerical integration methods #cite(<main>).

+ $f_1 (x,y,z) = 1 + x + y^2 + x^2 y + x^4 + y^5 + x^2 y^2 z^2$\
  This is a simple polynomial function whose spherical harmonic expansion is finite, terminating at degree 6. It is expected that quadrature schemes will integrate this function to machine precision once their degree of exactness surpasses the function's polynomial degree. The exact integral is $I[f_1] = (216 pi)/35$.
+ $f_2 (x,y,z) = $ A sum of four Gaussian bells\
  This function is infinitely smooth ($C^infinity$) but is not a polynomial, representing functions with localized features. Its spherical harmonic expansion is infinite, requiring a greater number of points to achieve high accuracy. The exact integral is known numerically to high precision.
+ $f_3 (x,y,z,alpha) = (1 + tanh(- alpha (x+y-z)))\/alpha$\
  This function is smooth and possesses a distinct anti-symmetric property across the plane $x + y - z = 0$. It is designed to test how quadrature grids handle functions with strong underlying symmetries. Its exact integral is $I[f_3] = (4 pi)/alpha$.
+ $f_4 (x,y,z,alpha) = (1-"sign"(x+y-z))\/alpha$\
  This function is a discontinuous version of f3, featuring a step discontinuity across the same plane. Such functions present a significant challenge for quadrature rules, as their spherical harmonic expansions converge very slowly. This test evaluates the robustness of the schemes when faced with non-smooth integrands. The exact integral is $I[f_3] = (4 pi)/alpha$.
+ $f_5 (x,y,z,alpha) = (1-"sign"(pi x+ y))\/alpha$\
  This function is a variation of f4 where the line of discontinuity has been shifted. Its purpose is to test the performance of schemes like spherical designs when their nodes, which previously avoided the discontinuity in $f_4$, now lie upon it. The exact integral is $I[f_3] = (4 pi)/alpha$.


= Results

The numerical experiments provide a clear visualization of the theoretical properties of each quadrature scheme, highlighting the practical trade-offs between them. The efficiency analysis in #ref(<fig_efficiency>) confirms the theoretical predictions: the Lebedev quadrature rapidly approaches the maximum possible efficiency of E≈1, while the Gaussian Product and symmetric Spherical Design schemes level off at the lower theoretical limit of $E approx 2/3$.

#figure(image("image (10).png"),
caption: [Efficiency Factor Analysis of quadrature schemes #cite(<demo2>)]
) <fig_efficiency>

For the smooth polynomial function $f_1$, the convergence plot of #ref(<fig:f1>) shows Lebedev and symmetric Spherical Design to be more efficient. Both algorithms enjoy quick, spectral convergence, reaching machine precision (error $< 10^(-13)$) using fewer than 100 points. The Gaussian Product rule follows a similar convergence pattern but requires significantly more points ($N > 500$) for the same accuracy. In contrast, the uniform and clustered Monte Carlo algorithms exhibit the anticipated slow, linear convergence on the log-log graph, as they do have their $O(N^(-1/2))$ rate of error and are quite inefficient for smooth functions.

#figure(image("image (11).png"),
  caption: [Integration Error Comparison of quadrature schemes against the test function $f_1$ #cite(<demo2>)]) 
  <fig:f1>
// #image("image (7).png")
This trend in performance continues on to the infinitely smooth function $f_2$, as one can see from #ref(<fig:f2>). Convergence for all of the deterministic methods is slower due to the infinite spherical harmonic series of the function. But relative performance is maintained: Lebedev and Spherical Design rules continue to score higher than the Gaussian Product scheme, with smaller error for a given number of points. The Monte Carlo methods again mark the lowest performance, with no significant improvement in convergence rate.

#figure(image("image (13).png"),
  caption: [Integration Error Comparison of quadrature schemes against the test function $f_2$ #cite(<demo2>)]) 
  <fig:f2>

The most illuminating conclusions are when combining functions with specific symmetries and discontinuities. For the anti-symmetric function $f_3$, #ref(<fig:f3>) shows a highly impressive outcome. The Lebedev and symmetric Spherical Design rules exact integrate (machine precision) for all numbers of nodes tested. This is a direct consequence of their symmetric grids, which perfectly cancel the odd-degree spherical harmonics that comprise the function. The Non-symmetric Gaussian Product and the Monte Carlo grids fail to avail themselves of this property and exhibit their typical, slower convergence.

#figure(image("image (14).png"),
  caption: [Integration Error Comparison of quadrature schemes against the test function $f_3$ #cite(<demo2>)]) 
  <fig:f3>

The influence of discontinuities is illustrated graphically in Figures #ref(<fig:f4>, supplement: none) and #ref(<fig:f5>, supplement: none). In the case of function $f_4$ (#ref(<fig:f4>)), the symmetric Spherical Design is very close to ideal accuracy because its nodes are well-distanced from the line of discontinuity of the function. On the other hand, the Lebedev quadrature performance is highly unpredictable with the error wildly gyrating between machine precision and poor accuracy. This instability occurs because for certain N, its grid points fall on the discontinuity directly. When the discontinuity is shifted in function $f_5$ (#ref(<fig:f5>)), the advantage of the Spherical Design is lost. Its grid points now cross the discontinuity, leading to the same chaotic and unstable performance with the Lebedev scheme. For these hard non-smooth functions, the deterministic algorithms could be no better than the slow-but-steady Monte Carlo algorithms, and pointing out their reliance on the specific properties of the integrand.

#figure(image("image (15).png"),
  caption: [Integration Error Comparison of quadrature schemes against the test function $f_4$ #cite(<demo2>)]) 
  <fig:f4>
  
#figure(image("image (16).png"),
  caption: [Integration Error Comparison of quadrature schemes against the test function $f_5$ #cite(<demo2>)]) 
  <fig:f5>

= Conclusion

This thesis has investigated and compared the Gaussian and Chebyshev quadrature schemes for numerical integration on the sphere, both in theoretical foundation and in numerical performance. Numerical tests confirm a common theme of numerical analysis: no technique is better in every situation. The ideal quadrature scheme to employ is a function of the particular characteristics of the function to be integrated and the computational constraints of the problem at hand.

*Lebedev quadratures* and *spherical t-designs* are presently the most efficient schemes for numerically integrating smooth functions. Their optimally symmetric point distributions make them able to achieve a specified accuracy at the least number of function values, so that they are the integration scheme of preference in applications where the integrand is computationally expensive. The exceptional precision of these methods on functions with particular symmetries also highlights the advantage of using grids sympathetic to the sphere geometry. But high precision is not necessarily stable. As illustrated with discontinuous functions, placing points on or near a discontinuity can produce large and unstable errors.

*Gaussian product quadrature* is a stable, versatile, and easy-to-use method. Though theoretically less economic and requiring more points than Lebedev or spherical design principles for smooth functions, it is highly predictable and stable in performance. Its greatest asset is its simplicity of construction and one that does not depend on tables of pre-computed nodes and weights. This makes it extremely flexible to very high orders of integration and allows adjustments, such as the imposition of grid symmetry, to be able to handle efficiently specific classes of functions.

Finally, the *Monte Carlo* method is a useful gold standard. Though its convergence is slow, its simplicity and lack of reliance on the problem dimension make it a choice, particularly in very high-dimensional integrals or to obtain coarse estimates.

In brief, the quadrature scheme selection for spherical integration is a trade-off between peak performance and overall good performance. For well-behaved, smooth functions, the efficiency of Lebedev and spherical design rules is unchallenged. For discontinuity applications or where flexibility and ease of implementation are required, the Gaussian product rule offers a good and effective alternative.

#bibliography("ref.bib")

/////////////////////////////////////////  Appendix  /////////////////////////////////////////////
#pagebreak()

#align(center)[
  #text(15pt, strong[Appendix A. Gauss-Legendre Quadrature]) <appendixA>\
]
#v(1em) 

Gauss-Legendre quadrature is a numerical integration method that approximates the definite integral of a function $f(x)$ over the interval $[-1, 1]$ using a weighted sum of function evaluations at specific points, called Gauss-Legendre nodes. It is highly accurate for polynomials and smooth functions, achieving exact results for polynomials of degree up to $2n-1$ with $n$ nodes #cite(<Gauss-Legendre>), #cite(<FiniteElementCourse_2025>).

*The Fundamental Theorem*

A key theorem in Gaussian quadrature states that for an $N$-point rule, if the nodes are chosen as the roots of the orthogonal polynomial of degree $N$ (in this case, the Legendre polynomial $P_N (x)$), the rule will be exact for all polynomials of degree up to 2N−1. 
// This is because a polynomial of degree $2N−1$ can be uniquely written as $f(x)=q(x)P_N (x) + r(x)$, where $q(x)$ and $r(x)$ are polynomials of degree less than N. Since the nodes $x_i$ are the roots of $P_N (x)$, the first term vanishes at these points, and the quadrature rule integrates the remainder polynomial $r(x)$ exactly.

*Mathematical Derivation*

*Polynomial Division*\
By the division algorithm for polynomials, any polynomial $f(x)$ of degree at most $2N−1$ can be uniquely written as a combination of the $N$-th degree Legendre polynomial, $P_N (x)$, and two other polynomials, $q(x)$ and $r(x)$, both of degree at most $N−1$ #cite(<FiniteElementCourse_2025>):
$
  f(x) = q(x)P_N (x) + r(x)
$

*Evaluating the Quadrature Rule*\
The nodes of the Gauss-Legendre rule, $x_i$, are specifically chosen to be the $N$ roots of the Legendre polynomial $P_N (x)$. By definition, this means $P_N (x_i)=0$ for all $i=1,…,N$.
Applying the quadrature rule to $f(x)$, the first term of the polynomial division vanishes at each node:

$
  Q[f] &= sum_(i =1)^N w_i f(x_i) 
  = sum_(i = 1)^N w_i [q(x_i)P_N (x_i) + r(x_i)] \
  &= sum_(i = 1)^N w_i [q(x_i) dot 0 + r(x_i)] 
  = sum_(i =1)^N w_i r(x_i)
$ <A_equ_sum>

The problem of integrating $f(x)$ is thus reduced to integrating the lower-degree polynomial $r(x)$. Since the degree of $r(x)$ is at most $N−1$, it is a linear combination of Legendre polynomials $P_0,...,P_(N−1)$.

*Evaluating the Exact Integral*\
Now consider the exact integral of $f(x)$:

$
  integral_(-1)^1 f(x) d x 
  &= integral_(-1)^1 [q(x)P_N (x) + r(x)] d x \
  &= integral_(-1)^1 q(x)P_N (x) d x + integral_(-1)^1 r(x) d x
$

​The key insight here comes from the orthogonality of Legendre polynomials. Since $q(x)$ is a polynomial of degree at most $N - 1$, it can be expanded as a linear combination of $P_0 (x), ..., P_(N-1) (x)$. Due to the orthogonality property, the integral of any product of $P_N (x)$ and a polynomial of a lower degree is zero. Therefore, the first term in the exact integral is:

$
  integral_(-1)^1 q(x)P_N (x) d x = 0  
$

This leaves only the integral of the remainder polynomial

$
  integral_(-1)^1 f(x) d x = integral_(-1)^1 r(x) d x 
$ <A_equ_int>

*Conclusion*\
The weights $w_i$ in the Gauss-Legendre rule are constructed precisely to make the rule exact for all polynomials of degree up to $N - 1$. Since r (x) is a polynomial of degree at most
$N - 1$, the quadrature $sum_(i=0)^N w_i r(x_i)$ is equal to the exact integral $integral_(-1)^1 r(x) d x$.
Combining the results from #ref(<A_equ_sum>) and #ref(<A_equ_int>):

$
  sum_(i =1)^N w_i f(x_i) = sum_(i =1)^N w_i r(x_i) 
  = integral_(-1)^1 r(x) d x = integral_(-1)^1 f(x) d x 
$

This proves that the N-point Gauss-Legendre quadrature rule is exact for all polynomials of degree up to $2N - 1$. This remarkable property, achieved by the optimal choice of nodes and weights, is what makes Gaussian quadrature so powerful and widely used in numerical analysis.

#align(center)[
  #text(16pt, strong[Appendix B. Code & Demo]) <appendixB>\
]
#v(1em)

The JavaScript source code for the quadratures discussed and generated figures is freely available under MIT License.

#align(center)[https://github.com/mhdeeb/spherical-quadrature]
