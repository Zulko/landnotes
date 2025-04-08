/**
 * Extracts contour polylines and dots points from a grid of 0s and 1s
 * @param {Array<Array<number>>} grid - 2D array where 1 represents filled cells
 * @returns {Object} Object containing polylines and dots squares
 */
function extractGridContours(grid) {
  if (!grid || grid.length === 0 || grid[0].length === 0) {
    return { polylines: [], dots: [] };
  }
  
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array(rows).fill().map(() => Array(cols).fill(false));
  const polylines = [];
  const dots = [];
  
  // Helper to check if a cell is valid and has value 1
  const isValid = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 1;
  
  // Find all connected components
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1 && !visited[r][c]) {
        const cells = [];
        
        // DFS to find all cells in this connected component
        const dfs = (row, col) => {
          if (!isValid(row, col) || visited[row][col]) {
            return;
          }
          
          visited[row][col] = true;
          cells.push([row, col]);
          
          // Check 4 adjacent cells (connected by sides)
          dfs(row + 1, col); // down
          dfs(row - 1, col); // up
          dfs(row, col + 1); // right
          dfs(row, col - 1); // left
        };
        
        dfs(r, c);
        
        // If only one cell in component, it's dots
        if (cells.length === 1) {
          dots.push([r, c]);
        } else {
          // Otherwise, trace the contour
          const contour = traceContour(grid, cells);
          polylines.push(contour);
        }
      }
    }
  }
  
  return { polylines, dots };
}

/**
 * Traces the contour around a group of connected cells
 * @param {Array<Array<number>>} grid - The original grid
 * @param {Array<Array<number>>} cells - The cells in the connected component
 * @returns {Array<Array<number>>} Polyline as array of points [row, col]
 */
function traceContour(grid, cells) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // Create a set to mark cells in our component
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  
  // Find leftmost cell (with ties broken by topmost) as our starting point
  const startCell = cells.reduce((min, cell) => 
    (cell[1] < min[1] || (cell[1] === min[1] && cell[0] < min[0])) ? cell : min
  );
  
  // Create a boundary map - each cell has 4 boundaries (top, right, bottom, left)
  const visited = new Set();
  const contour = [];
  
  // Direction vectors (clockwise): right, down, left, up
  const dr = [0, 1, 0, -1];
  const dc = [1, 0, -1, 0];
  
  // Start from the left side of the leftmost cell
  let currentCell = [...startCell];
  let dir = 3; // Start going left (to the boundary)
  
  // Find the first boundary point
  let nr = currentCell[0] + dr[dir];
  let nc = currentCell[1] + dc[dir];
  
  // If it's inside, keep turning right until we hit a boundary
  while (cellSet.has(`${nr},${nc}`)) {
    dir = (dir + 1) % 4;
    nr = currentCell[0] + dr[dir];
    nc = currentCell[1] + dc[dir];
  }
  
  // First boundary point
  contour.push([currentCell[0], currentCell[1]]);
  
  // Maximum iterations to prevent infinite loops
  const MAX_ITERATIONS = cells.length * 8;
  let iterations = 0;
  
  do {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.warn('Contour tracing reached maximum iterations. Stopping to prevent infinite loop.');
      break;
    }
    
    // Turn left (counterclockwise) and try to move
    dir = (dir + 3) % 4;
    let newR = currentCell[0] + dr[dir];
    let newC = currentCell[1] + dc[dir];
    
    // Keep turning right until we find a valid position
    while (!cellSet.has(`${newR},${newC}`) || newR < 0 || newR >= rows || newC < 0 || newC >= cols) {
      dir = (dir + 1) % 4;
      newR = currentCell[0] + dr[dir];
      newC = currentCell[1] + dc[dir];
    }
    
    // Move to the new position
    currentCell = [newR, newC];
    contour.push([...currentCell]);
    
    // Continue until we return to the starting point
  } while (!(currentCell[0] === startCell[0] && 
             currentCell[1] === startCell[1] && 
             contour.length > 1));
  
  return contour;
}


function testTraceContour() {
  const grid = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0],
  ];
  const cells = [
    [1, 1],
    [1, 2],
  ];
  const contour = traceContour(grid, cells);
  console.log({contour}) // This should return [[1, 1], [1, 2], [1, 3], [2, 3], [2, 2], [2, 1], [1, 1]]
}
testTraceContour();


function squareListtoGrid(squares) {
  if (!squares || squares.length === 0) {
    return { grid: [], xCoordMap: new Map(), yCoordMap: new Map() };
  }

  // Since all squares have the same dimension, we can use the first square to get the unit
  const unitDistance = squares[0].xMax - squares[0].xMin;
  
  // Get min/max coordinates
  const xMin = Math.min(...squares.map(sq => sq.xMin));
  const xMax = Math.max(...squares.map(sq => sq.xMax));
  const yMin = Math.min(...squares.map(sq => sq.yMin));
  const yMax = Math.max(...squares.map(sq => sq.yMax));
  
  // Calculate grid dimensions
  const rows = Math.round((yMax - yMin) / unitDistance) + 1;
  const cols = Math.round((xMax - xMin) / unitDistance) + 1;
  
  // Initialize grid with zeros
  const grid = Array(rows).fill().map(() => Array(cols).fill(0));
  
  // Create coordinate mapping
  const xCoordMap = new Map();
  const yCoordMap = new Map();
  
  // Fill the grid and coordinate maps
  for (const square of squares) {
    // Calculate grid indices
    const r = Math.round((square.yMin - yMin) / unitDistance);
    const c = Math.round((square.xMin - xMin) / unitDistance);
    
    // Store actual coordinates in the maps
    yCoordMap.set(r, square.yMin);
    yCoordMap.set(r+1, square.yMax);
    xCoordMap.set(c, square.xMin);
    xCoordMap.set(c+1, square.xMax);
    
    // Ensure we don't go out of bounds
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      grid[r][c] = 1;
    }
  }
  
  return { grid, xCoordMap, yCoordMap, unitDistance };
}

function convertLatLonToXY(square) {
  return {
    xMin: square.minLon,
    xMax: square.maxLon,
    yMin: square.minLat,
    yMax: square.maxLat
  };
}

function convertXYToLatLon(point) {
  return {
    lat: point.y,
    lon: point.x
  };
}

export function smoothPolyline(polyline) {
  if (!polyline || polyline.length < 3) return polyline;
  
  // Make a copy to avoid modifying the original
  let points = [...polyline];
  
  // If first and last points aren't the same, close the loop
  if (points[0].x !== points[points.length - 1].x || 
      points[0].y !== points[points.length - 1].y) {
    points.push({...points[0]});
  }
  
  const smoothed = [];
  // Use Chaikin's algorithm - cut corners by creating two points at 1/4 and 3/4 along each segment
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i+1];
    
    // First point at 1/4 from p0 to p1
    const q0 = {
      x: p0.x * 0.75 + p1.x * 0.25,
      y: p0.y * 0.75 + p1.y * 0.25
    };
    
    // Second point at 3/4 from p0 to p1
    const q1 = {
      x: p0.x * 0.25 + p1.x * 0.75,
      y: p0.y * 0.25 + p1.y * 0.75
    };
    
    // For the first point, add both points
    if (i === 0) {
      smoothed.push(q0);
    }
    
    // Always add the second point
    smoothed.push(q1);
  }
  
  // Ensure the loop is closed
  if (smoothed[0].x !== smoothed[smoothed.length - 1].x || 
      smoothed[0].y !== smoothed[smoothed.length - 1].y) {
    smoothed.push({...smoothed[0]});
  }
  
  return smoothed;
}

function latlonSquaresToPolylines(squares) {
  if (!squares || squares.length === 0) {
    return {
      polylines: [],
      dots: []
    }
  }
  
  const xySquares = squares.map(convertLatLonToXY);
  const { grid, xCoordMap, yCoordMap, unitDistance } = squareListtoGrid(xySquares);
  
  const { polylines, dots } = extractGridContours(grid);
  
  // Convert grid coordinates to actual lat/lon
  const convertedPolylines = polylines.map(polyline => 
    polyline.map(([r, c]) => ({
      x: (xCoordMap.get(c) + xCoordMap.get(c+1)) / 2,
      y: (yCoordMap.get(r) + yCoordMap.get(r+1)) / 2
    }))
  );
  // Apply smoothing
  const smoothedPolylines = convertedPolylines.map(smoothPolyline);
  
  // Convert to lat/lon format
  const polylinesWithLatLon = smoothedPolylines.map(polyline => 
    polyline.map(convertXYToLatLon)
  );
  
  // Handle dots points
  const dotsWithLatLon = dots.map(([r, c]) => 
    ({
      minLat: yCoordMap.get(r),
      maxLat: yCoordMap.get(r+1),
      minLon: xCoordMap.get(c),
      maxLon: xCoordMap.get(c+1)
    })
  );
  polylinesWithLatLon.sort((a, b) => b.length - a.length);
  return {
    polylines: polylinesWithLatLon,
    dots: dotsWithLatLon
  };
}

// Export the functions
export { latlonSquaresToPolylines };
