import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/location/get_current_position.dart';
import '../../core/providers.dart';
import 'map_corridor_models.dart';
import 'map_corridor_repository.dart';
import 'offline_file_tile_provider.dart';

// Same URL pattern the web Live Map page already uses for supervisors (spec §20: "External
// navigation apps may be opened when available") — a convenience on top of the offline map, not a
// replacement for it: this needs real signal and a maps app to actually work.
Uri _googleMapsUri(double lat, double lng) =>
    Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');

String _formatDistance(double meters) {
  if (meters < 1000) return '${meters.round()} m';
  return '${(meters / 1000).toStringAsFixed(1)} km';
}

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
      if (mounted) {
        setState(() {
          _error = '$e';
          _loading = false;
        });
      }
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

  double? _distanceMetersTo(MapCorridorLocation loc) {
    final pos = _currentPosition;
    if (pos == null) return null;
    return Geolocator.distanceBetween(pos.latitude, pos.longitude, loc.latitude, loc.longitude);
  }

  /// Spec §20's "distance to next" — the first stop in planned order (the list is already
  /// sequence-sorted by the backend) that isn't marked completed yet.
  MapCorridorLocation? get _nextStop {
    final locations = _corridor?.locations;
    if (locations == null) return null;
    for (final loc in locations) {
      if (loc.status != 'COMPLETED') return loc;
    }
    return null;
  }

  void _showLocationDetails(MapCorridorLocation loc) {
    final distance = _distanceMetersTo(loc);
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(loc.locationName, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Status: ${loc.status}'),
            const SizedBox(height: 4),
            Text(distance != null ? 'Distance from you: ${_formatDistance(distance)}' : 'Turn on location to see distance'),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              icon: const Icon(Icons.directions),
              label: const Text('Open in Google Maps'),
              onPressed: () async {
                final uri = _googleMapsUri(loc.latitude, loc.longitude);
                final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
                if (!opened && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Could not open Google Maps — check you have signal and a maps app installed.')),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
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
    final nextStop = _nextStop;
    final nextStopDistance = nextStop != null ? _distanceMetersTo(nextStop) : null;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            nextStop == null
                ? 'All stops completed for today.'
                : _currentPosition == null
                    ? 'Distance to next stop (${nextStop.locationName}): turn on location to see this'
                    : 'Distance to next stop (${nextStop.locationName}): ${_formatDistance(nextStopDistance!)}',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
        Expanded(
          child: FlutterMap(
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
                      child: GestureDetector(
                        onTap: () => _showLocationDetails(loc),
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
          ),
        ),
      ],
    );
  }
}
