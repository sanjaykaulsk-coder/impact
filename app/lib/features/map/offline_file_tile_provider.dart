import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_map/flutter_map.dart';

/// Reads map tiles from the local cache `MapCorridorRepository.prefetchTiles` already populated —
/// no network call happens here at all, by design. If a tile isn't on disk (a prefetch that
/// failed, or one that hasn't run yet), flutter_map shows its normal blank/error tile for that one
/// square rather than this provider trying (and failing slowly) to reach the network itself.
class OfflineFileTileProvider extends TileProvider {
  final String cacheDirPath;
  OfflineFileTileProvider(this.cacheDirPath);

  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    final file = File('$cacheDirPath/${coordinates.z}_${coordinates.x}_${coordinates.y}.png');
    return FileImage(file);
  }
}
