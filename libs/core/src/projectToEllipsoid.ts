import { Vector3 } from 'three'

const vectorScratch = new Vector3()

// Reference: https://github.com/CesiumGS/cesium/blob/1.122/packages/engine/Source/Core/scaleToGeodeticSurface.js
export function projectToEllipsoid(
  vector: Vector3,
  oneOverRadiiSquared: Vector3,
  centerTolerance = 0.1,
  result = new Vector3()
): Vector3 | undefined {
  const { x, y, z } = vector
  const rx = oneOverRadiiSquared.x
  const ry = oneOverRadiiSquared.y
  const rz = oneOverRadiiSquared.z
  const x2 = x * x * rx
  const y2 = y * y * ry
  const z2 = z * z * rz

  // Compute the squared ellipsoid norm.
  const normSquared = x2 + y2 + z2
  const ratio = Math.sqrt(1 / normSquared)

  // When very close to center or at center.
  if (!Number.isFinite(ratio)) {
    return undefined
  }

  // As an initial approximation, assume that the radial intersection is the
  // projection point.
  result.copy(vector).multiplyScalar(ratio)
  if (normSquared < centerTolerance) {
    return result
  }

  // Use the gradient at the intersection point in place of the true unit
  // normal. The difference in magnitude will be absorbed in the multiplier.
  const gradient = vectorScratch
    .multiplyVectors(result, oneOverRadiiSquared)
    .multiplyScalar(2)

  // Compute the initial guess at the normal vector multiplier.
  let lambda = ((1 - ratio) * vector.length()) / (gradient.length() / 2)

  let correction = 0
  let sx: number
  let sy: number
  let sz: number
  let error: number
  do {
    lambda -= correction
    sx = 1 / (1 + lambda * rx)
    sy = 1 / (1 + lambda * ry)
    sz = 1 / (1 + lambda * rz)
    const sx2 = sx * sx
    const sy2 = sy * sy
    const sz2 = sz * sz
    const sx3 = sx2 * sx
    const sy3 = sy2 * sy
    const sz3 = sz2 * sz
    error = x2 * sx2 + y2 * sy2 + z2 * sz2 - 1
    correction = error / ((x2 * sx3 * rx + y2 * sy3 * ry + z2 * sz3 * rz) * -2)
  } while (Math.abs(error) > 1e-12)

  return result.set(x * sx, y * sy, z * sz)
}
