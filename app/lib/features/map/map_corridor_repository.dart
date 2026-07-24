import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../../core/api/api_client.dart';
import 'map_corridor_models.dart';

class MapCorridorRepository {
  final ApiClient api;
  MapCorridorRepository({required this.api});

  Future<File> _manifestCacheFile(String campaignId, String userId) async {
    final dir = await _tileCacheDir();
    return File('${dir.path}/corridor_${campaignId}_$userId.json');
  }

  /// Tries the network first (so a field worker who re-opens this mid-morning with signal gets
  /// today's freshest assignment list), falling back to whatever manifest was cached from the
  /// last successful fetch if the network call fails. Caught live, on a real running emulator,
  /// testing with network deliberately disabled: without this fallback, the screen failed outright
  /// on a second, offline open — even though every tile it needed was already sitting on disk —
  /// because only the tile *images* were being cached, not the manifest (locations + which tiles
  /// belong to today's corridor) that tells the map what to draw. That's the actual point of
  /// "offline map corridors" (spec §20): sync once with signal, then no network needed at all.
  Future<MapCorridorResponse> getCorridor(String campaignId, String userId, {String? date}) async {
    final cacheFile = await _manifestCacheFile(campaignId, userId);
    try {
      final qs = date != null ? '?date=$date' : '';
      final json = await api.get('/campaigns/$campaignId/map-corridor/$userId$qs');
      await cacheFile.writeAsString(jsonEncode(json));
      return MapCorridorResponse.fromJson(json as Map<String, dynamic>);
    } catch (e) {
      if (await cacheFile.exists()) {
        final cached = jsonDecode(await cacheFile.readAsString()) as Map<String, dynamic>;
        return MapCorridorResponse.fromJson(cached);
      }
      rethrow;
    }
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
          final bytes = await api.getBytes(tile.path);
          await file.writeAsBytes(bytes);
        } catch (_) {
          // Best-effort, see doc comment above.
        }
      }
      done += 1;
      onProgress?.call(done, tiles.length);
    }
  }
}
