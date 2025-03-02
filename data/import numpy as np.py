import numpy as np
import math
from scipy.integrate import quad

def integrand(x):
    # 22 * pi will be factored out at the end, or you can include it here.
    return x**4 * math.sqrt(1 + 1936*x**6)

res, err = quad(integrand, 0, 1)
surface_area = 22 * math.pi * res

print("Approximate surface area =", surface_area)