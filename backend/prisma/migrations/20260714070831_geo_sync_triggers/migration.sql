-- Prisma's query API cannot construct PostGIS geometries directly (see docs/ASSUMPTIONS.md A-014),
-- so application code always writes plain latitude/longitude Decimal columns — the source of truth
-- for the app layer. A trigger keeps each row's PostGIS geography(Point,4326) column in sync on
-- every insert/update, so PostGIS distance/containment queries (deviation-radius checks, §14) are
-- genuinely usable from day one without forcing raw SQL into every write path.

CREATE OR REPLACE FUNCTION sync_geo_point() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."geoPoint" := ST_SetSRID(ST_MakePoint(NEW."longitude"::float8, NEW."latitude"::float8), 4326)::geography;
  ELSE
    NEW."geoPoint" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_sync_geo_point
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "locations"
  FOR EACH ROW EXECUTE FUNCTION sync_geo_point();

CREATE TRIGGER gps_points_sync_geo_point
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "gps_points"
  FOR EACH ROW EXECUTE FUNCTION sync_geo_point();

-- A PostGIS index on each, so radius/containment queries (e.g. deviation tolerance checks) stay
-- fast as GPS point volume grows (spec: thousands of users, high-frequency GPS traces).
CREATE INDEX gps_points_geo_point_gix ON "gps_points" USING GIST ("geoPoint");
CREATE INDEX locations_geo_point_gix ON "locations" USING GIST ("geoPoint");
