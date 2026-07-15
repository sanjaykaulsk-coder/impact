import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/location/get_current_position.dart';
import '../../core/offline/outbox_database.dart';
import '../../core/providers.dart';
import '../auth/auth_controller.dart';
import 'execution_models.dart';

class ActivityDetailScreen extends ConsumerStatefulWidget {
  final String assignmentId;
  const ActivityDetailScreen({super.key, required this.assignmentId});

  @override
  ConsumerState<ActivityDetailScreen> createState() => _ActivityDetailScreenState();
}

class _ActivityDetailScreenState extends ConsumerState<ActivityDetailScreen> {
  ActivityBundle? _bundle;
  String? _error;
  bool _loading = true;
  bool _actionInProgress = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _campaignId => ref.read(authControllerProvider).selectedCampaignId!;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final bundle = await ref.read(executionRepositoryProvider).getOrCreateActivity(_campaignId, widget.assignmentId);
      if (mounted) setState(() => _bundle = bundle);
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _syncNow() async {
    try {
      await ref.read(syncServiceProvider).syncPending();
    } catch (_) {
      // Best-effort — the outbox keeps the item queued for the next trigger regardless.
    }
    if (mounted) await _load();
  }

  Future<void> _checkIn() async {
    setState(() => _actionInProgress = true);
    try {
      final position = await getCurrentPositionOrThrow();
      await ref.read(outboxDatabaseProvider).enqueue(
        type: 'checkIn',
        campaignId: _campaignId,
        activityInstanceId: _bundle!.activity.id,
        payload: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracyMeters': position.accuracy,
          'deviceTimestamp': DateTime.now().toIso8601String(),
        },
      );
      await _syncNow();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Check-in failed: $e')));
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  Future<void> _checkOut() async {
    setState(() => _actionInProgress = true);
    try {
      final position = await getCurrentPositionOrThrow();
      await ref.read(outboxDatabaseProvider).enqueue(
        type: 'checkOut',
        campaignId: _campaignId,
        activityInstanceId: _bundle!.activity.id,
        payload: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'deviceTimestamp': DateTime.now().toIso8601String(),
        },
      );
      await _syncNow();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Check-out failed: $e')));
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Activity')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    final bundle = _bundle!;
    final milestone = bundle.milestone;
    final outboxDb = ref.watch(outboxDatabaseProvider);

    return StreamBuilder<List<OutboxItem>>(
      stream: outboxDb.watchForActivity(bundle.activity.id),
      builder: (context, snapshot) {
        final outbox = snapshot.data ?? const <OutboxItem>[];
        // A 'failed' outbox item hasn't actually reached the server — counting it here would let
        // check-out proceed on a photo that doesn't exist yet server-side, which the backend's
        // own check-out validation would then reject anyway (a confusing second failure for what
        // looks, from this screen, like an already-satisfied requirement).
        final hasCheckIn = bundle.hasCheckIn || outbox.any((i) => i.type == 'checkIn' && i.status != 'failed');
        final hasCheckOut = bundle.hasCheckOut || outbox.any((i) => i.type == 'checkOut' && i.status != 'failed');
        final photoCount = bundle.media.length + outbox.where((i) => i.type == 'media' && i.status != 'failed').length;
        final hasFormResponse =
            bundle.hasFormResponse || outbox.any((i) => i.type == 'milestoneResponse' && i.status != 'failed');

        final requiredPhotos = milestone?.mandatoryPhotoCount ?? 0;
        final needsGps = milestone?.mandatoryGps ?? false;
        final needsForm = milestone?.formVersion != null;

        final canCheckOut =
            !hasCheckOut && (!needsGps || hasCheckIn) && photoCount >= requiredPhotos && (!needsForm || hasFormResponse);

        return RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(milestone?.name ?? 'Field activity', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text('Status: ${bundle.activity.status}', style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 16),

              _RequirementTile(
                icon: Icons.my_location,
                label: 'GPS check-in',
                done: hasCheckIn,
                subtitle: needsGps ? 'Required' : 'Not required for this milestone',
              ),
              _RequirementTile(
                icon: Icons.camera_alt,
                label: 'Photos',
                done: photoCount >= requiredPhotos,
                subtitle: '$photoCount of $requiredPhotos captured',
              ),
              if (needsForm)
                _RequirementTile(icon: Icons.assignment, label: 'Outlet Visit form', done: hasFormResponse, subtitle: hasFormResponse ? 'Submitted' : 'Not submitted yet'),

              const SizedBox(height: 20),

              if (!hasCheckIn)
                ElevatedButton.icon(
                  onPressed: _actionInProgress ? null : _checkIn,
                  icon: const Icon(Icons.my_location),
                  label: const Text('Check in'),
                ),
              if (hasCheckIn && photoCount < requiredPhotos)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress
                        ? null
                        : () async {
                            await context.push(
                              '/activity/${widget.assignmentId}/camera',
                              extra: {'activityInstanceId': bundle.activity.id, 'campaignId': _campaignId},
                            );
                            await _load();
                          },
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Take opening photo'),
                  ),
                ),
              if (hasCheckIn && needsForm && !hasFormResponse)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress
                        ? null
                        : () async {
                            await context.push(
                              '/activity/${widget.assignmentId}/form',
                              extra: {
                                'activityInstanceId': bundle.activity.id,
                                'campaignId': _campaignId,
                                'milestone': milestone,
                              },
                            );
                            await _load();
                          },
                    icon: const Icon(Icons.assignment),
                    label: const Text('Fill outlet form'),
                  ),
                ),
              if (canCheckOut)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress ? null : _checkOut,
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Check out — complete activity'),
                  ),
                ),
              if (hasCheckOut)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text('Activity completed.', style: TextStyle(fontWeight: FontWeight.bold)),
                ),

              if (outbox.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text('Sync status', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...outbox.map((item) => _OutboxStatusTile(
                      item: item,
                      onRetake: item.type == 'media' && item.status == 'failed'
                          ? () async {
                              await ref.read(outboxDatabaseProvider).discard(item.id);
                              if (!mounted) return;
                              await this.context.push(
                                '/activity/${widget.assignmentId}/camera',
                                extra: {'activityInstanceId': bundle.activity.id, 'campaignId': _campaignId},
                              );
                              await _load();
                            }
                          : null,
                    )),
                TextButton.icon(
                  onPressed: _syncNow,
                  icon: const Icon(Icons.sync),
                  label: const Text('Sync now'),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _RequirementTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool done;
  final String subtitle;
  const _RequirementTile({required this.icon, required this.label, required this.done, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: done ? Colors.green : Colors.grey),
      title: Text(label),
      subtitle: Text(subtitle),
      trailing: Icon(done ? Icons.check_circle : Icons.radio_button_unchecked, color: done ? Colors.green : Colors.grey),
    );
  }
}

class _OutboxStatusTile extends StatelessWidget {
  final OutboxItem item;
  final VoidCallback? onRetake;
  const _OutboxStatusTile({required this.item, this.onRetake});

  @override
  Widget build(BuildContext context) {
    final Color color = switch (item.status) {
      'synced' => Colors.green,
      'syncing' => Colors.blue,
      'failed' => Colors.red,
      _ => Colors.orange,
    };
    return ListTile(
      dense: true,
      leading: Icon(Icons.circle, size: 12, color: color),
      title: Text(_labelFor(item.type)),
      subtitle: item.errorMessage != null ? Text(item.errorMessage!, style: const TextStyle(color: Colors.red)) : null,
      trailing: onRetake != null
          ? TextButton(onPressed: onRetake, child: const Text('Retake'))
          : Text(item.status),
    );
  }

  String _labelFor(String type) => switch (type) {
        'checkIn' => 'Check-in',
        'checkOut' => 'Check-out',
        'media' => 'Photo',
        'milestoneResponse' => 'Form submission',
        _ => type,
      };
}
