function enrichPrefixTreeWithBounds(
    tree, 
    prefix = "", 
    latRange = [-90, 90], 
    lonRange = [-180, 180]
) {
    /**
     * Traverses a prefix tree of hybrid geohashes and adds bounding box information to each node,
     * calculating bounds as it goes
     *
     * @param {Object} tree - The prefix tree node to enrich
     * @param {string} prefix - The current prefix path in the tree
     * @param {Array} latRange - Current latitude range [min, max]
     * @param {Array} lonRange - Current longitude range [min, max]
     * @returns {Object} The enriched tree with bounding box information at each node
     */
    
    // Skip end-of-string markers
    if (tree === true) {
        return tree;
    }

    // Add bounds to the current node
    if (prefix) {
        tree["_bounds"] = {
            min_lat: latRange[0],
            max_lat: latRange[1],
            min_lon: lonRange[0],
            max_lon: lonRange[1],
        };
    }

    // Process child nodes
    for (const char of Object.keys(tree)) {
        if (char === "$" || char.startsWith("_")) {
            continue;
        }

        const subtree = tree[char];
        
        // Calculate new bounds based on the character
        const newLatRange = [...latRange];
        const newLonRange = [...lonRange];

        if (prefix.length === 0) {
            // First character is base32
            const _base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
            try {
                const ch = _base32.indexOf(char.toLowerCase());
                if (ch === -1) {
                    console.log(`Invalid base32 character: ${char}`);
                    continue;
                }
                
                const bits = [16, 8, 4, 2, 1];
                let bit = 0;

                for (let i = 0; i < 5; i++) {
                    if (bit % 2 === 0) {  // Even bits encode longitude
                        const mid = (newLonRange[0] + newLonRange[1]) / 2;
                        if (ch & bits[i]) {
                            newLonRange[0] = mid;
                        } else {
                            newLonRange[1] = mid;
                        }
                    } else {  // Odd bits encode latitude
                        const mid = (newLatRange[0] + newLatRange[1]) / 2;
                        if (ch & bits[i]) {
                            newLatRange[0] = mid;
                        } else {
                            newLatRange[1] = mid;
                        }
                    }
                    bit += 1;
                }
            } catch (error) {
                console.log(`Error with base32 character ${char}: ${error}`);
                continue;
            }
        } else {
            // Remaining characters are base4 (quadtree)
            try {
                const quadrant = parseInt(char, 10);
                if (isNaN(quadrant) || quadrant < 0 || quadrant > 3) {
                    throw new Error(`Invalid base4 character: ${char}`);
                }

                const midLat = (newLatRange[0] + newLatRange[1]) / 2;
                const midLon = (newLonRange[0] + newLonRange[1]) / 2;

                // Decode quadrant: 0: SW, 1: SE, 2: NW, 3: NE
                if (quadrant & 2) {  // North (2 or 3)
                    newLatRange[0] = midLat;
                } else {  // South (0 or 1)
                    newLatRange[1] = midLat;
                }

                if (quadrant & 1) {  // East (1 or 3)
                    newLonRange[0] = midLon;
                } else {  // West (0 or 2)
                    newLonRange[1] = midLon;
                }
            } catch (error) {
                console.log(`Error with character ${char}: ${error}`);
                continue;
            }
        }

        // Recursively process the subtree with updated bounds
        tree[char] = enrichPrefixTreeWithBounds(
            subtree, 
            prefix + char, 
            newLatRange, 
            newLonRange
        );
    }

    return tree;
}

/**
 * Finds all nodes in the prefix tree that overlap with the given bounds and have a specific prefix length
 * @param {Object} tree - The prefix tree to search
 * @param {Object} bounds - The geographic bounds to search within {minLat, minLon, maxLat, maxLon}
 * @param {number} prefixLength - The desired prefix length to match
 * @param {string} currentPrefix - The current prefix being examined (used in recursion)
 * @param {Array} results - Array to collect matching nodes (used in recursion)
 * @returns {Array} - Array of nodes that match the criteria
 */
function findNodesInBounds(tree, bounds, prefixLength, currentPrefix = "", results = []) {
    // Base case: if we've reached a leaf node or undefined node
    if (!tree || typeof tree !== 'object') {
        return results;
    }

    // If we've reached the desired prefix length and the node overlaps with bounds
    if (currentPrefix.length === prefixLength && 
        tree._bounds && 
        boundsOverlap(tree._bounds, bounds)) {
        
        // If this node has entries, add them to results
        if (tree.$ && Array.isArray(tree.$)) {
            results.push(...tree.$);
        } else if (tree.$) {
            results.push(tree.$);
        }
        
        // If this node has a best entry, add it to results
        if (tree.bestEntry) {
            results.push(tree.bestEntry);
        }
        
        return results;
    }

    // If we've exceeded the desired prefix length, stop recursion
    if (currentPrefix.length > prefixLength) {
        return results;
    }

    // Check if this subtree could potentially overlap with our bounds
    if (tree._bounds && !boundsOverlap(tree._bounds, bounds)) {
        return results; // Skip this branch if it doesn't overlap
    }

    // Recursively search child nodes
    for (const char in tree) {
        if (char !== '_bounds' && char !== '$' && char !== 'bestEntry' && char !== 'bestScore') {
            findNodesInBounds(
                tree[char], 
                bounds, 
                prefixLength, 
                currentPrefix + char, 
                results
            );
        }
    }

    return results;
}

/**
 * Checks if two bounding boxes overlap
 * @param {Object} bounds1 - First bounding box with [minLat, maxLat], [minLon, maxLon]
 * @param {Object} bounds2 - Second bounding box with {minLat, minLon, maxLat, maxLon}
 * @returns {boolean} - True if the bounds overlap
 */
function boundsOverlap(bounds1, bounds2) {
    const [latRange, lonRange] = bounds1;
    
    return !(
        latRange[1] < bounds2.minLat || // bounds1 is south of bounds2
        latRange[0] > bounds2.maxLat || // bounds1 is north of bounds2
        lonRange[1] < bounds2.minLon || // bounds1 is west of bounds2
        lonRange[0] > bounds2.maxLon    // bounds1 is east of bounds2
    );
}
