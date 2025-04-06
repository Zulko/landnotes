/**
 * Given an array of squares (each with properties: xMin, xMax, yMin, yMax),
 * this function returns an object with:
 *   - polylines: an array of polylines (each polyline is an array of {x, y} points)
 *     representing the union boundary of connected groups of squares.
 *   - isolatedSquares: an array of squares (with their original coordinates)
 *     that do not connect with any other square.
 */
export function getConnectedPolylinesAndIsolated(squares) {
  // --- Step 1. Group squares by connectivity using DFS ---
  const groups = [];
  const visited = new Array(squares.length).fill(false);

  // Two squares are considered connected if their areas overlap or even just touch.
  function areConnected(sq1, sq2) {
    // Check if squares share a vertical edge (left-right)
    const shareVerticalEdge = 
      ((Math.abs(sq1.xMax - sq2.xMin) < 1e-9) || (Math.abs(sq1.xMin - sq2.xMax) < 1e-9)) && 
      (sq1.yMin < sq2.yMax && sq1.yMax > sq2.yMin);
    
    // Check if squares share a horizontal edge (top-bottom)
    const shareHorizontalEdge = 
      ((Math.abs(sq1.yMax - sq2.yMin) < 1e-9) || (Math.abs(sq1.yMin - sq2.yMax) < 1e-9)) && 
      (sq1.xMin < sq2.xMax && sq1.xMax > sq2.xMin);
    
    return shareVerticalEdge || shareHorizontalEdge;
  }

  function dfs(index, group) {
    visited[index] = true;
    group.push(squares[index]);
    for (let j = 0; j < squares.length; j++) {
      if (!visited[j] && areConnected(squares[index], squares[j])) {
        dfs(j, group);
      }
    }
  }

  for (let i = 0; i < squares.length; i++) {
    if (!visited[i]) {
      const group = [];
      dfs(i, group);
      groups.push(group);
    }
  }

  // --- Step 2. For each group, compute the union boundary if connected,
  //         or add the square directly if isolated ---
  const polylines = [];
  const isolatedSquares = [];

  groups.forEach(group => {
    if (group.length === 1) {
      isolatedSquares.push(group[0]);
    } else {
      const polyline = computeUnionBoundary(group);
      polylines.push(polyline);
    }
  });

  return { polylines, isolatedSquares };
}

/**
 * Given a group of axis-aligned squares, compute the union boundary as a polyline.
 * This implementation uses an improved grid-based approach to ensure the polyline
 * follows the exact square edges more precisely.
 */
function computeUnionBoundary(squares) {
  // Gather unique x and y coordinates from all squares in the group.
  let xCoords = [];
  let yCoords = [];
  squares.forEach(sq => {
    xCoords.push(sq.xMin, sq.xMax);
    yCoords.push(sq.yMin, sq.yMax);
  });
  xCoords = Array.from(new Set(xCoords)).sort((a, b) => a - b);
  yCoords = Array.from(new Set(yCoords)).sort((a, b) => a - b);

  const cols = xCoords.length - 1;
  const rows = yCoords.length - 1;

  // Build a grid with precise square containment detection
  const grid = [];
  for (let j = 0; j < rows; j++) {
    grid[j] = [];
    for (let i = 0; i < cols; i++) {
      const cellMin = { x: xCoords[i], y: yCoords[j] };
      const cellMax = { x: xCoords[i + 1], y: yCoords[j + 1] };
      
      // A cell is considered inside if any square contains any part of the cell
      let inside = false;
      for (const sq of squares) {
        // Check if the cell and square overlap (not just the center point)
        if (!(cellMax.x <= sq.xMin || cellMin.x >= sq.xMax || 
              cellMax.y <= sq.yMin || cellMin.y >= sq.yMax)) {
          inside = true;
          break;
        }
      }
      grid[j][i] = inside ? 1 : 0;
    }
  }

  // Now extract boundary segments by checking transitions between inside and outside cells.
  const segments = [];

  // Horizontal segments (along grid rows)
  for (let j = 0; j <= rows; j++) {
    const y = yCoords[j];
    let inSegment = false;
    let segmentStart = null;
    
    for (let i = 0; i < cols; i++) {
      const above = (j - 1 >= 0) ? grid[j - 1][i] : 0;
      const below = (j < rows) ? grid[j][i] : 0;
      
      if (above !== below) {
        if (!inSegment) {
          segmentStart = xCoords[i];
          inSegment = true;
        }
      } else if (inSegment) {
        segments.push({ x1: segmentStart, y1: y, x2: xCoords[i], y2: y });
        inSegment = false;
      }
    }
    
    // Close any segment that reaches the edge
    if (inSegment) {
      segments.push({ x1: segmentStart, y1: y, x2: xCoords[cols], y2: y });
    }
  }

  // Vertical segments (along grid columns)
  for (let i = 0; i <= cols; i++) {
    const x = xCoords[i];
    let inSegment = false;
    let segmentStart = null;
    
    for (let j = 0; j < rows; j++) {
      const left = (i - 1 >= 0) ? grid[j][i - 1] : 0;
      const right = (i < cols) ? grid[j][i] : 0;
      
      if (left !== right) {
        if (!inSegment) {
          segmentStart = yCoords[j];
          inSegment = true;
        }
      } else if (inSegment) {
        segments.push({ x1: x, y1: segmentStart, x2: x, y2: yCoords[j] });
        inSegment = false;
      }
    }
    
    // Close any segment that reaches the edge
    if (inSegment) {
      segments.push({ x1: x, y1: segmentStart, x2: x, y2: yCoords[rows] });
    }
  }

  // Now, connect segments into a continuous polyline.
  // (This approach assumes that the union boundary forms a single closed loop.)
  if (segments.length === 0) return [];

  // Sort segments to find a good starting point (top-left corner)
  const segs = segments.slice();
  segs.sort((a, b) => (a.x1 - b.x1) || (a.y1 - b.y1));
  const startSeg = segs.shift();
  const polyline = [
    { x: startSeg.x1, y: startSeg.y1 },
    { x: startSeg.x2, y: startSeg.y2 }
  ];

  // Helper: compare points with a tolerance.
  function pointsEqual(p1, p2) {
    return Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(p1.y - p2.y) < 1e-9;
  }

  let currentPoint = polyline[polyline.length - 1];
  let iterations = 0;
  while (segs.length > 0 && iterations < 1000) {
    iterations++;
    let found = false;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (pointsEqual({ x: seg.x1, y: seg.y1 }, currentPoint)) {
        polyline.push({ x: seg.x2, y: seg.y2 });
        currentPoint = { x: seg.x2, y: seg.y2 };
        segs.splice(i, 1);
        found = true;
        break;
      } else if (pointsEqual({ x: seg.x2, y: seg.y2 }, currentPoint)) {
        polyline.push({ x: seg.x1, y: seg.y1 });
        currentPoint = { x: seg.x1, y: seg.y1 };
        segs.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) break;
    // If we have looped back to the start, exit.
    if (pointsEqual(currentPoint, polyline[0])) break;
  }

  return polyline;
}


export function smoothPolyline(polyline) {
    const smoothed = [];
    for (let i = 0; i < polyline.length - 1; i++) {
        const p1 = polyline[i];
        const p2 = polyline[i + 1];
        const average = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        }
        smoothed.push(average);
    }
    //add the last average between the last point and the first point
    const firstPoint = polyline[0];
    const lastPoint = polyline[polyline.length - 1];
    const lastAverage = {
        x: (lastPoint.x + firstPoint.x) / 2,
        y: (lastPoint.y + firstPoint.y) / 2
    }
    smoothed.push(lastAverage);
    smoothed.push(smoothed[0]);
    return smoothed;
}

function convertLatLonToXY(square) {
    return {
        xMin: square.minLon,
        xMax: square.maxLon,
        yMin: square.minLat,
        yMax: square.maxLat
    }
}

function convertXYToLatLon(point) {
    return {
        lat: point.y,
        lon: point.x,
    }
}
function convertXYRangeToLatLon(square) {
    return {
        minLon: square.xMin,
        maxLon: square.xMax,
        minLat: square.yMin,
        maxLat: square.yMax
    }
}
export function smoothenGeoSquares(geoSquares, smoothing=0) {
    const xySquares = geoSquares.map(convertLatLonToXY);
    console.log({xySquares});
    let { polylines, isolatedSquares } = getConnectedPolylinesAndIsolated(
      xySquares
    );
    console.log({polylines, isolatedSquares});
    for (let i = 0; i < smoothing; i++) {
        polylines = polylines.map((polyline) =>
            smoothPolyline(polyline)
        );
    }
    return [...polylines.map((polyline) => polyline.map(convertXYToLatLon)), ...isolatedSquares.map(convertXYRangeToLatLon)];
}