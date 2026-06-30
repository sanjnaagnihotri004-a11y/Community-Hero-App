// Geohash encoder and decoder in pure TypeScript
// Uses standard Base32 alphabet: 0123456789bcdefghjkmnpqrstuvwxyz (omits a, i, l, o)

const BASE32_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encodes latitude and longitude into a geohash string
 * @param latitude 
 * @param longitude 
 * @param precision (default 6: represents ~1.2km x 0.6km grid)
 * @returns geohash
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = 6): string {
    let isEven = true;
    let latMin = -90.0, latMax = 90.0;
    let lonMin = -180.0, lonMax = 180.0;
    let geohash = "";
    let bit = 0;
    let ch = 0;

    while (geohash.length < precision) {
        let mid;
        if (isEven) {
            mid = (lonMin + lonMax) / 2;
            if (longitude > mid) {
                ch |= (1 << (4 - bit));
                lonMin = mid;
            } else {
                lonMax = mid;
            }
        } else {
            mid = (latMin + latMax) / 2;
            if (latitude > mid) {
                ch |= (1 << (4 - bit));
                latMin = mid;
            } else {
                latMax = mid;
            }
        }

        isEven = !isEven;
        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32_ALPHABET[ch];
            bit = 0;
            ch = 0;
        }
    }

    return geohash;
}

interface GeohashDecoded {
    latitude: number;
    longitude: number;
    latitudeError: number;
    longitudeError: number;
}

/**
 * Decodes a geohash string into latitude and longitude bounds/center
 * @param geohash 
 * @returns decoded bounds
 */
export function decodeGeohash(geohash: string): GeohashDecoded {
    let isEven = true;
    let latMin = -90.0, latMax = 90.0;
    let lonMin = -180.0, lonMax = 180.0;

    for (let i = 0; i < geohash.length; i++) {
        const c = geohash[i];
        const cd = BASE32_ALPHABET.indexOf(c);
        if (cd === -1) throw new Error("Invalid geohash character");

        for (let j = 0; j < 5; j++) {
            const mask = 1 << (4 - j);
            if (isEven) {
                const mid = (lonMin + lonMax) / 2;
                if (cd & mask) {
                    lonMin = mid;
                } else {
                    lonMax = mid;
                }
            } else {
                const mid = (latMin + latMax) / 2;
                if (cd & mask) {
                    latMin = mid;
                } else {
                    latMax = mid;
                }
            }
            isEven = !isEven;
        }
    }

    const latitude = (latMin + latMax) / 2;
    const longitude = (lonMin + lonMax) / 2;
    const latitudeError = latMax - latitude;
    const longitudeError = lonMax - longitude;

    return { latitude, longitude, latitudeError, longitudeError };
}
