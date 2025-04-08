def encode_hybrid(lat, lon, base4_precision=8):
    # Start with base32 encoding for the first character
    lat_range = [-90, 90]
    lon_range = [-180, 180]
    _base32 = "0123456789bcdefghjkmnpqrstuvwxyz"

    hashcode = ""
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0

    # First char (base32, 5 bits)
    for i in range(5):
        if bit % 2 == 0:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon > mid:
                ch |= bits[i]
                lon_range[0] = mid
            else:
                lon_range[1] = mid
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat > mid:
                ch |= bits[i]
                lat_range[0] = mid
            else:
                lat_range[1] = mid
        bit += 1
    hashcode += _base32[ch]

    # Now subsequent chars: base4 encoding (quadtree)
    for _ in range(base4_precision):
        mid_lat = (lat_range[0] + lat_range[1]) / 2
        mid_lon = (lon_range[0] + lon_range[1]) / 2

        quadrant = 0
        if lat >= mid_lat:
            quadrant += 2  # north
            lat_range[0] = mid_lat
        else:
            lat_range[1] = mid_lat

        if lon >= mid_lon:
            quadrant += 1  # east
            lon_range[0] = mid_lon
        else:
            lon_range[1] = mid_lon

        hashcode += str(quadrant)

    return hashcode


def decode_hybrid(hashcode):
    """
    Decode a hybrid geohash (base32 + base4) to its bounding box.

    Args:
        hashcode (str): The hybrid geohash to decode

    Returns:
        tuple: (minLat, minLon, maxLat, maxLon) representing the bounding box
    """

    # Initialize coordinate ranges
    lat_range = [-90, 90]
    lon_range = [-180, 180]

    # Base32 decoding for first character
    _base32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    first_char = hashcode[0].lower()

    try:
        ch = _base32.index(first_char)
    except ValueError:
        raise ValueError(f"Invalid base32 character: {first_char}")

    # Decode the first character (base32, 5 bits)
    bits = [16, 8, 4, 2, 1]
    bit = 0

    for i in range(5):
        if bit % 2 == 0:  # Even bits encode longitude
            mid = (lon_range[0] + lon_range[1]) / 2
            if ch & bits[i]:
                lon_range[0] = mid
            else:
                lon_range[1] = mid
        else:  # Odd bits encode latitude
            mid = (lat_range[0] + lat_range[1]) / 2
            if ch & bits[i]:
                lat_range[0] = mid
            else:
                lat_range[1] = mid
        bit += 1

    # Decode the remaining characters (base4 quadtree)
    for char in hashcode[1:]:
        try:
            quadrant = int(char)
            if quadrant < 0 or quadrant > 3:
                raise ValueError
        except ValueError:
            raise ValueError(f"Invalid base4 character: {char}")

        mid_lat = (lat_range[0] + lat_range[1]) / 2
        mid_lon = (lon_range[0] + lon_range[1]) / 2

        # Decode quadrant
        # 0: SW, 1: SE, 2: NW, 3: NE
        if quadrant & 2:  # North (2 or 3)
            lat_range[0] = mid_lat
        else:  # South (0 or 1)
            lat_range[1] = mid_lat

        if quadrant & 1:  # East (1 or 3)
            lon_range[0] = mid_lon
        else:  # West (0 or 2)
            lon_range[1] = mid_lon

    return {
        "min_lat": lat_range[0],
        "min_lon": lon_range[0],
        "max_lat": lat_range[1],
        "max_lon": lon_range[1],
    }
