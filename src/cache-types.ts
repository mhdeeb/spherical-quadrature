interface BoundingBox3D {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
}

interface NumericRange {
    min: number;
    max: number;
}

interface CacheItem<TData> {
    // The primary data payload (schema-agnostic)
    data: TData;

    // Optional computed metadata that many consumers expect
    boundingBox?: BoundingBox3D;
    weightRange?: NumericRange;

    // Optional identifiers and metadata for discoverability
    id?: number | string;
    kind?: string; // e.g., 'lebedev', 'HardinSloane', etc.
    meta?: Record<string, unknown>;
}

export type { BoundingBox3D, NumericRange, CacheItem }
