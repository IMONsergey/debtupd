// Geometry measured from the supplied, unmodified SVG paths. VIP rooms are not stands.
export const floors = [
  {
    id: 1,
    width: 2780,
    height: 1591,
    image: 'assets/exhibition/floor-1.svg',
    stands: [
      {
        number: 1,
        x: 806.654,
        y: 1405.65,
        width: 83.119,
        height: 51.47,
      },
      {
        number: 2,
        x: 984.384,
        y: 1405.65,
        width: 83.116,
        height: 51.47,
      },
      {
        number: 3,
        x: 1163.14,
        y: 1405.65,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 4,
        x: 1336.76,
        y: 1405.65,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 5,
        x: 1520.65,
        y: 1405.65,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 6,
        x: 1698.38,
        y: 1405.65,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 7,
        x: 1850.43,
        y: 1372.85,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 8,
        x: 1961.562,
        y: 1294.222,
        width: 87.363,
        height: 77.573,
      },
      {
        number: 9,
        x: 1843.24,
        y: 930.191,
        width: 51.47,
        height: 83.119,
      },
      {
        number: 10,
        x: 2034.32,
        y: 813.074,
        width: 51.47,
        height: 83.119,
      },
      {
        number: 11,
        x: 2020.97,
        y: 637.277,
        width: 83.12,
        height: 51.471,
      },
      {
        number: 12,
        x: 2077.47,
        y: 499.613,
        width: 51.4,
        height: 68.86,
      },
      {
        number: 13,
        x: 2077.47,
        y: 424.617,
        width: 51.4,
        height: 68.86,
      },
      {
        number: 14,
        x: 2077.47,
        y: 349.621,
        width: 51.4,
        height: 68.859,
      },
      {
        number: 15,
        x: 2020.97,
        y: 234.561,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 16,
        x: 1858.65,
        y: 234.561,
        width: 83.12,
        height: 51.47,
      },
      {
        number: 17,
        x: 1778.52,
        y: 281.818,
        width: 51.39,
        height: 75.024,
      },
      {
        number: 18,
        x: 1778.52,
        y: 362.977,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 19,
        x: 1778.52,
        y: 483.176,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 20,
        x: 1778.52,
        y: 564.336,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 21,
        x: 1635.72,
        y: 564.336,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 22,
        x: 1635.72,
        y: 483.176,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 23,
        x: 1635.72,
        y: 362.977,
        width: 51.39,
        height: 75.023,
      },
      {
        number: 24,
        x: 1635.72,
        y: 281.818,
        width: 51.39,
        height: 75.024,
      },
    ],
  },
  {
    id: 2,
    width: 2789,
    height: 1591,
    image: 'assets/exhibition/floor-2.svg',
    stands: [
      {
        number: 25,
        x: 2143.71,
        y: 341.162,
        width: 47.37,
        height: 76.551,
      },
      {
        number: 26,
        x: 1999.84,
        y: 809.438,
        width: 76.55,
        height: 47.373,
      },
      {
        number: 27,
        x: 1619.64,
        y: 809.438,
        width: 76.55,
        height: 47.373,
      },
    ],
  },
];

// Add only confirmed DEBT TECH 2026 assignments. The brief screenshot is a past event.
// { id, name, logo: "assets/...", description, standNumbers: [1, 2] }
export const exhibitors = [];

// Visual samples only, never confirmed bookings or part of exhibitors.
export const demoStandStatus = { 8: 'occupied', 9: 'free' };

// Exact artwork copied from the original SVG; geometry and digit outlines are unchanged.
export const occupiedStandArtwork = {
  8: {
    shape:
      'M1967.84 1326.28L2015.15 1296.32C2021.45 1292.33 2029.79 1294.2 2033.78 1300.5L2046.83 1321.11C2050.82 1327.41 2048.94 1335.75 2042.64 1339.74L1995.33 1369.7C1989.03 1373.69 1980.69 1371.81 1976.71 1365.51L1963.66 1344.9C1959.67 1338.6 1961.54 1330.26 1967.84 1326.28Z',
    number:
      'M2016.96 1335.29C2019.54 1339.2 2018.89 1342.83 2015.03 1345.39C2011.16 1347.95 2007.55 1347.13 2004.97 1343.23L2003.7 1341.31C2002.15 1338.97 2001.65 1336.7 2002.7 1334.65C2000.52 1334.84 1998.67 1333.71 1997.08 1331.31L1996.57 1330.54C1993.99 1326.64 1994.64 1323 1998.51 1320.44C2002.38 1317.88 2005.98 1318.7 2008.56 1322.6L2009.07 1323.37C2010.66 1325.78 2010.94 1327.94 2009.95 1329.85C2012.25 1329.69 2014.15 1331.04 2015.69 1333.37L2016.96 1335.29ZM2008.73 1340.59C2010.16 1342.75 2011.5 1342.72 2012.72 1341.91C2013.94 1341.1 2014.45 1339.91 2013.06 1337.72L2011.56 1335.46C2010.29 1333.54 2008.93 1333.24 2007.57 1334.14C2006.21 1335.04 2005.97 1336.4 2007.23 1338.32L2008.73 1340.59ZM2000.5 1328.14L2001.4 1329.5C2002.69 1331.45 2004.01 1331.48 2005.27 1330.65C2006.49 1329.84 2007.01 1328.59 2005.72 1326.64L2004.82 1325.28C2003.37 1323.08 2002.03 1323.11 2000.81 1323.92C1999.59 1324.73 1999.05 1325.95 2000.5 1328.14Z',
  },
};
