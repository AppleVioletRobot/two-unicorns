export const ROOM = {
  width: 12,
  height: 7,
  startZ: 8,
  endZ: -10,
  eyeHeight: 1.65,
};

export const PLANES = [
  {
    id: 'plane-01',
    label: 'PLANE 1',
    z: 3.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
  },
  {
    id: 'plane-02',
    label: 'PLANE 2',
    z: -0.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
  },
  {
    id: 'plane-03',
    label: 'PLANE 3',
    z: -4.5,
    width: 9,
    height: 5.8,
    apertureWidth: 3.2,
    apertureHeight: 4.4,
  },
];

export const STOPS = [
  { id: 'entrance', label: 'Entrance', z: 7.5 },
  { id: 'before-1', label: 'Before plane 1', z: 4.8 },
  { id: 'between-1-2', label: 'Between planes 1 and 2', z: 1.5 },
  { id: 'between-2-3', label: 'Between planes 2 and 3', z: -2.5 },
  { id: 'turnaround', label: 'Turnaround space', z: -7.5 },
];
