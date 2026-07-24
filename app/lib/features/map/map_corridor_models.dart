// Hand-maintained Dart mirror of the backend's map-corridor response (same convention as
// core/api/models.dart) — spec §20 offline maps, Post-MVP backlog.

class MapCorridorLocation {
  final String locationName;
  final double latitude;
  final double longitude;
  final int? plannedSequence;
  final String status; // PENDING | IN_PROGRESS | COMPLETED

  MapCorridorLocation({
    required this.locationName,
    required this.latitude,
    required this.longitude,
    this.plannedSequence,
    required this.status,
  });

  factory MapCorridorLocation.fromJson(Map<String, dynamic> json) => MapCorridorLocation(
        locationName: json['locationName'] as String,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        plannedSequence: json['plannedSequence'] as int?,
        status: json['status'] as String,
      );
}

class MapCorridorTile {
  final int z;
  final int x;
  final int y;
  // A path relative to the app's own API base URL, not an absolute URL — proxied through the
  // backend rather than a signed MinIO link, so the same host resolution that already works for
  // every other API call (emulator's 10.0.2.2, or a physical device's configured LAN address)
  // applies here too.
  final String path;

  MapCorridorTile({required this.z, required this.x, required this.y, required this.path});

  factory MapCorridorTile.fromJson(Map<String, dynamic> json) => MapCorridorTile(
        z: json['z'] as int,
        x: json['x'] as int,
        y: json['y'] as int,
        path: json['path'] as String,
      );
}

class MapCorridorResponse {
  final List<MapCorridorLocation> locations;
  final List<MapCorridorTile> tiles;
  final int tileCount;

  MapCorridorResponse({required this.locations, required this.tiles, required this.tileCount});

  factory MapCorridorResponse.fromJson(Map<String, dynamic> json) => MapCorridorResponse(
        locations: (json['locations'] as List<dynamic>)
            .map((e) => MapCorridorLocation.fromJson(e as Map<String, dynamic>))
            .toList(),
        tiles: (json['tiles'] as List<dynamic>).map((e) => MapCorridorTile.fromJson(e as Map<String, dynamic>)).toList(),
        tileCount: json['tileCount'] as int,
      );
}
