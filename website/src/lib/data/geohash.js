/**
 * Encodes latitude and longitude coordinates into a standard base-32 geohash
 *
 * @param {number} lat - Latitude coordinate (-90 to 90)
 * @param {number} lon - Longitude coordinate (-180 to 180)
 * @param {number} precision - Length of the geohash to generate (default: 9)
 * @returns {string} - The geohash string
 */
export function latLonToGeohash(lat, lon, precision = 9) {
  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (lon < -180 || lon > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let geohash = "";

  // Start with full ranges
  let latRange = [-90, 90];
  let lonRange = [-180, 180];

  // Each character encodes 5 bits (2.5 iterations of lat/lon)
  let isEven = true;
  let bit = 0;
  let charIndex = 0;

  while (geohash.length < precision) {
    if (isEven) {
      // Longitude
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        charIndex = (charIndex << 1) + 1;
        lonRange[0] = mid;
      } else {
        charIndex = (charIndex << 1) + 0;
        lonRange[1] = mid;
      }
    } else {
      // Latitude
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        charIndex = (charIndex << 1) + 1;
        latRange[0] = mid;
      } else {
        charIndex = (charIndex << 1) + 0;
        latRange[1] = mid;
      }
    }

    isEven = !isEven;
    bit++;

    // Every 5 bits, append a character
    if (bit === 5) {
      geohash += base32.charAt(charIndex);
      bit = 0;
      charIndex = 0;
    }
  }

  return geohash;
}

/**
 * Converts a geohash string to latitude and longitude coordinates
 *
 * @param {string} geohash - The geohash string to decode
 * @returns {Object} - Object containing {lat, lon} coordinates of the geohash center
 */
export function geohashToLatLon(geohash) {
  if (!geohash || geohash.length === 0) {
    throw new Error("Invalid geohash: empty string");
  }

  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  // Start with full ranges
  let latRange = [-90, 90];
  let lonRange = [-180, 180];

  let isEven = true; // longitude first

  for (let i = 0; i < geohash.length; i++) {
    const char = geohash.charAt(i);
    const charIndex = base32.indexOf(char);

    if (charIndex === -1) {
      throw new Error(`Invalid geohash character: ${char}`);
    }

    // Each character encodes 5 bits
    for (let bit = 0; bit < 5; bit++) {
      const bitValue = (charIndex >> (4 - bit)) & 1;

      if (isEven) {
        // Longitude
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (bitValue === 1) {
          lonRange[0] = mid;
        } else {
          lonRange[1] = mid;
        }
      } else {
        // Latitude
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bitValue === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }

      isEven = !isEven;
    }
  }

  // Return the center of the bounding box
  const lat = (latRange[0] + latRange[1]) / 2;
  const lon = (lonRange[0] + lonRange[1]) / 2;

  return { lat, lon };
}

/**
 * Decodes a hybrid geohash to its center latitude and longitude coordinates
 *
 * @param {string} geohash - The hybrid geohash (first character base32, remaining characters base4)
 * @returns {Object} - Object containing {lat, lon} center coordinates
 */
export function decodeHybridGeohash(geohash) {
  if (!geohash || geohash.length === 0) {
    throw new Error("Invalid geohash: empty string");
  }

  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  // Start with full ranges
  let latRange = [-90, 90];
  let lonRange = [-180, 180];

  // Process the first character (base32)
  const firstChar = geohash.charAt(0);
  const firstCharIndex = base32.indexOf(firstChar);

  if (firstCharIndex === -1) {
    throw new Error(`Invalid base32 character: ${firstChar}`);
  }

  // Decode the 5 bits of the base32 character
  for (let bit = 0; bit < 5; bit++) {
    const bitValue = (firstCharIndex >> (4 - bit)) & 1;

    if (bit % 2 === 0) {
      // Even bits encode longitude
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (bitValue === 1) {
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      // Odd bits encode latitude
      const mid = (latRange[0] + latRange[1]) / 2;
      if (bitValue === 1) {
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }
  }

  // Process remaining characters (base4 quadtree)
  for (let i = 1; i < geohash.length; i++) {
    const quadrant = parseInt(geohash.charAt(i));

    if (isNaN(quadrant) || quadrant < 0 || quadrant > 3) {
      throw new Error(
        `Invalid quadrant character at position ${i}: ${geohash.charAt(i)}`
      );
    }

    const midLat = (latRange[0] + latRange[1]) / 2;
    const midLon = (lonRange[0] + lonRange[1]) / 2;

    // Adjust ranges based on quadrant
    // 0=SW, 1=SE, 2=NW, 3=NE
    if (quadrant & 2) {
      // North (2 or 3)
      latRange[0] = midLat;
    } else {
      // South (0 or 1)
      latRange[1] = midLat;
    }

    if (quadrant & 1) {
      // East (1 or 3)
      lonRange[0] = midLon;
    } else {
      // West (0 or 2)
      lonRange[1] = midLon;
    }
  }

  // Return the center point
  return {
    lat: (latRange[0] + latRange[1]) / 2,
    lon: (lonRange[0] + lonRange[1]) / 2,
  };
}

/**
 * Returns all hybrid geoencodings of size 5 that overlap with the given bounds
 * @param {Object} bounds - The geographic bounds to search within {min_lat, min_lon, max_lat, max_lon}
 * @param {number} zoomLevel - The zoom level to search for
 * @returns {Array} - Array of hybrid geoencodings (strings) that overlap with the bounds
 */
export function getOverlappingGeoEncodings(bounds, zoomLevel) {
  const { minLat, minLon, maxLat, maxLon } = bounds;
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  const results = [];

  // Search through all possible first characters (base32)
  for (let i = 0; i < base32.length; i++) {
    const char = base32[i];
    const charValue = i;

    // Calculate bounds for the first character (geohash-style)
    let latRange = [-90, 90];
    let lonRange = [-180, 180];

    // Decode the 5 bits of the base32 character
    for (let bit = 0; bit < 5; bit++) {
      const bitValue = (charValue >> (4 - bit)) & 1;

      if (bit % 2 === 0) {
        // Even bits encode longitude
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (bitValue === 1) {
          lonRange[0] = mid;
        } else {
          lonRange[1] = mid;
        }
      } else {
        // Odd bits encode latitude
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bitValue === 1) {
          latRange[0] = mid;
        } else {
          latRange[1] = mid;
        }
      }
    }

    // Check if this first-level cell overlaps with our target bounds
    if (
      !(
        latRange[1] < minLat ||
        latRange[0] > maxLat ||
        lonRange[1] < minLon ||
        lonRange[0] > maxLon
      )
    ) {
      // Explore the quadtree (base4) characters
      exploreQuadtree(char, latRange, lonRange, 1);
    }
  }

  // Recursive function to explore quadtree encodings
  function exploreQuadtree(prefix, latRange, lonRange, depth) {
    // If we've reached depth 5, we have a complete encoding
    if (depth === zoomLevel) {
      results.push(prefix);
      return;
    }

    // Try all four quadrants
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      // Create new ranges for this quadrant
      const newLatRange = [...latRange];
      const newLonRange = [...lonRange];

      const midLat = (newLatRange[0] + newLatRange[1]) / 2;
      const midLon = (newLonRange[0] + newLonRange[1]) / 2;

      // Adjust ranges based on quadrant
      // 0=SW, 1=SE, 2=NW, 3=NE
      if (quadrant & 2) {
        // North (2 or 3)
        newLatRange[0] = midLat;
      } else {
        // South (0 or 1)
        newLatRange[1] = midLat;
      }

      if (quadrant & 1) {
        // East (1 or 3)
        newLonRange[0] = midLon;
      } else {
        // West (0 or 2)
        newLonRange[1] = midLon;
      }

      // Check if this quadrant overlaps with our target bounds
      if (
        !(
          newLatRange[1] < minLat ||
          newLatRange[0] > maxLat ||
          newLonRange[1] < minLon ||
          newLonRange[0] > maxLon
        )
      ) {
        // Continue exploring this branch
        exploreQuadtree(prefix + quadrant, newLatRange, newLonRange, depth + 1);
      }
    }
  }

  return results;
}
