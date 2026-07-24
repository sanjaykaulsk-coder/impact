import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../../core/api/api_client.dart';
import 'map_corridor_models.dart';

class MapCorridorRepository {
  final ApiClient api;
  MapCorridorRepository({required this.api});

  Future<MapCorridorResponse> getCorridor(String campaignId, String userId, {String? date}) async {
    final qs = date != null ? '?date=$date' : '';
    final json = await api.get('/campaigns/$campaignId/map-corridor/$userId$qs');
    return MapCorridorResponse.fromJson(json as Map<String, dynamic>);
  }

  Future<Directory> _tileCacheDir() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/map_tiles');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<String> tileCachePath() async => (await _tileCacheDir()).path;

  /// Downloads every tile in the manifest to local disk, skipping ones already cached. Once this
  /// completes, the corridor's tiles are available with zero network — the actual "offline" half
  /// of "offline map corridors" (spec §20). A tile that fails to download is skipped, not retried
  /// here and not treated as fatal — flutter_map shows a blank tile for whatever isn't on disk,
  /// which is a fine degraded state for a handful of tiles on a bad connection, and the next time
  /// this runs (next corridor open, with better signal) it'll pick up whatever's still missing.
  Future<void> prefetchTiles(List<MapCorridorTile> tiles, {void Function(int done, int total)? onProgress}) async {
    final dir = await _tileCacheDir();
    var done = 0;
    for (final tile in tiles) {
      final file = File('${dir.path}/${tile.z}_${tile.x}_${tile.y}.png');
      if (!await file.exists()) {
        try {
          final res = await http.get(Uri.parse(tile.url));
          if (res.statusCode == 200) {
            await file.writeAsBytes(res.bodyBytes);
          }
        } catch (_) {
          // Best-effort, see doc comment above.
        }
      }
      done += 1;
      onProgress?.call(done, tiles.length);
    }
  }
}
