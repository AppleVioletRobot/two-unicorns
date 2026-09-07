export const ROOM = {
  width: 12,
  height: 7,
  startZ: 13,
  endZ: -10,
  eyeHeight: 1.65,
  stepSize: 0.5,
};

// Each plane is independently placeable. Change `aperturePosition` to
// 'left', 'middle', or 'right' and reorder these objects to test different traversals.
export const PLANES = [
  {
    id: 'plane-01',
    label: 'PLANE 1 · LEFT',
    z: 3.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
    aperturePosition: 'left',
  },
  {
    id: 'plane-02',
    label: 'PLANE 2 · RIGHT',
    z: -0.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
    aperturePosition: 'right',
  },
  {
    id: 'plane-03',
    label: 'PLANE 3 · MIDDLE',
    z: -4.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
    aperturePosition: 'middle',
  },
];
