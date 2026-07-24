import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/location/get_current_position.dart';
import '../../core/providers.dart';
import 'map_corridor_models.dart';
import 'map_corridor_repository.dart';
import 'offline_file_tile_provider.dart';

/// Spec §20 "Offline maps": current GPS, planned route, location sequence, completed/pending
/// locations. Tiles are fetched once (fetch-on-open, same as every other on-demand screen in this
/// app — there's no project-wide "sync everything each morning" bootstrap yet, so this doesn't
/// invent one just for map tiles) and cached to disk; after that, this screen needs no network at
/// all, which is the actual "offline corridor" behaviour spec §20 describes.
class RouteMapScreen extends ConsumerStatefulWidget {
  final String campaignId;
  final String userId;
  const RouteMapScreen({super.key, required this.campaignId, required this.userId});

  @override
  ConsumerState<RouteMapScreen> createState() => _RouteMapScreenState();
}

class _RouteMapScreenState extends ConsumerState<RouteMapScreen> {
  MapCorridorResponse? _corridor;
  String? _tileCachePath;
  String? _error;
  bool _loading = true;
  String _status = 'Loading your route…';
  LatLng? _currentPosition;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = MapCorridorRepository(api: ref.read(apiClientProvider));
    try {
      final corridor = await repo.getCorridor(widget.campaignId, widget.userId);
      final cachePath = await repo.tileCachePath();

      if (corridor.tiles.isNotEmpty) {
        if (mounted) setState(() => _status = 'Downloading map (0/${corridor.tiles.length})…');
        await repo.prefetchTiles(
          corridor.tiles,
          onProgress: (done, total) {
            if (mounted) setState(() => _status = 'Downloading map ($done/$total)…');
          },
        );
      }

      LatLng? position;
      try {
        final pos = await getCurrentPositionOrThrow();
        position = LatLng(pos.latitude, pos.longitude);
      } catch (_) {
        // Best-effort — the corridor map is still useful without a live GPS fix.
      }

      if (!mounted) return;
      setState(() {
        _corridor = corridor;
        _tileCachePath = cachePath;
        _currentPosition = position;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return Colors.green;
      case 'IN_PROGRESS':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Route Map')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(_status),
          ],
        ),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Could not load your route map: $_error'),
        ),
      );
    }
    final corridor = _corridor;
    if (corridor == null || corridor.locations.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('No assigned stops with a map location for today.'),
        ),
      );
    }

    final first = corridor.locations.first;
    return FlutterMap(
      options: MapOptions(
        initialCenter: LatLng(first.latitude, first.longitude),
        initialZoom: 14,
      ),
      children: [
        TileLayer(tileProvider: OfflineFileTileProvider(_tileCachePath!)),
        MarkerLayer(
          markers: [
            for (final loc in corridor.locations)
              Marker(
                point: LatLng(loc.latitude, loc.longitude),
                width: 36,
                height: 36,
                child: Tooltip(
                  message: '${loc.locationName} — ${loc.status}',
                  child: Icon(Icons.location_on, color: _statusColor(loc.status), size: 36),
                ),
              ),
            if (_currentPosition != null)
              Marker(
                point: _currentPosition!,
                width: 24,
                height: 24,
                child: const Icon(Icons.my_location, color: Colors.blue),
              ),
          ],
        ),
      ],
    );
  }
}
