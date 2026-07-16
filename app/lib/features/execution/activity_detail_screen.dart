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
    // Only the very first load (no bundle yet) blocks the screen on failure — this screen is
    // called again after every offline-capable action (photo, form) to pick up any server-side
    // changes, and that refresh is expected to fail while offline (the whole point of the
    // airplane-mode flow). Wiping the screen and losing sight of "check-in done, photo just
    // queued" on every offline action would defeat the purpose of the outbox in the first place —
    // "the UI reads from local state" (docs/architecture/05) means a failed refresh keeps showing
    // whatever was last known, not a blank error screen.
    final isInitialLoad = _bundle == null;
    setState(() {
      _loading = isInitialLoad;
      if (isInitialLoad) _error = null;
    });
    try {
      final bundle = await ref.read(executionRepositoryProvider).getOrCreateActivity(_campaignId, widget.assignmentId);
      if (mounted) setState(() => _bundle = bundle);
    } catch (e) {
      if (!mounted) return;
      if (isInitialLoad) {
        setState(() => _error = e is ApiException ? e.message : e.toString());
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not refresh from the server — showing what\'s saved on this device.')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _syncNow() async {
    try {
      await ref.read(syncServiceProvider).syncPending(force: true);
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

  /// After a rejected activity's flagged content has been redone (a new photo, an edited form),
  /// this puts it back in the supervisor's queue. A direct online call, not routed through the
  /// offline outbox — seeing the rejection at all already required connectivity.
  Future<void> _resubmit() async {
    setState(() => _actionInProgress = true);
    try {
      await ref.read(executionRepositoryProvider).resubmit(_campaignId, _bundle!.activity.id);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not resubmit: $e')));
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

        final approvalStatus = bundle.approval?.status;
        final isRejected = approvalStatus == 'REJECTED';
        final isPendingReview = hasCheckOut && approvalStatus == 'PENDING';
        final isApproved = approvalStatus == 'APPROVED';

        return RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(milestone?.name ?? 'Field activity', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text('Status: ${bundle.activity.status}', style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 16),

              if (isRejected)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.red.shade200)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Sent back by your supervisor', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade900)),
                            const SizedBox(height: 4),
                            Text(bundle.approval?.remarks ?? 'No reason given.', style: TextStyle(color: Colors.red.shade900)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              if (isPendingReview)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.amber.shade200)),
                  child: Text('Waiting for your supervisor to review this visit.', style: TextStyle(color: Colors.amber.shade900)),
                ),
              if (isApproved)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade200)),
                  child: Text('Approved by your supervisor.', style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold)),
                ),

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
              if (hasCheckIn && (photoCount < requiredPhotos || isRejected))
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
                    label: Text(isRejected ? 'Retake opening photo' : 'Take opening photo'),
                  ),
                ),
              if (hasCheckIn && needsForm && (!hasFormResponse || isRejected))
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
                    label: Text(isRejected ? 'Edit outlet form' : 'Fill outlet form'),
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
              if (isRejected)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress ? null : _resubmit,
                    icon: const Icon(Icons.send),
                    label: const Text('Resubmit for review'),
                  ),
                ),
              if (hasCheckOut && !isRejected && !isPendingReview && !isApproved)
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

/// Field users must never see a raw exception string (spec-adjacent founder directive after
/// real-device testing surfaced `ClientException with SocketException errno 103` on screen) — the
/// sync log's default view is a plain bilingual message; the technical detail stays available
/// behind a tap for support/diagnosis, never as the primary text.
// Bilingual (Hindi + English) subject noun for whatever actually failed — "Photo upload paused"
// read wrong for a failed form submission when this used to be one fixed string regardless of
// item type (found from a real screenshot during the founder's airplane-mode test).
(String hi, String en) _subjectFor(String type) => switch (type) {
      'media' => ('फोटो अपलोड', 'Photo upload'),
      'milestoneResponse' => ('फॉर्म भेजना', 'Form submission'),
      'checkIn' => ('चेक-इन भेजना', 'Check-in'),
      'checkOut' => ('चेक-आउट भेजना', 'Check-out'),
      _ => ('सिंक', 'Sync'),
    };

String _friendlyErrorMessage(OutboxItem item) {
  final raw = item.errorMessage?.toLowerCase() ?? '';
  final (subjectHi, subjectEn) = _subjectFor(item.type);
  if (raw.contains('socketexception') || raw.contains('connection abort') || raw.contains('network changed')) {
    return '$subjectHi रुक गया — अपने आप दोबारा कोशिश होगी। सलाह: वाई-फाई पर रहें।\n'
        '$subjectEn paused — will retry automatically. Tip: stay on Wi-Fi.';
  }
  if (raw.contains('timeoutexception') || raw.contains('timed out')) {
    return '$subjectHi में देर हो रही है — दोबारा कोशिश होगी।\n$subjectEn is taking longer than expected — will retry automatically.';
  }
  if (item.type == 'checkOut' && raw.contains('photo')) {
    return 'फोटो अपलोड होने का इंतज़ार है।\nWaiting for the photo to finish uploading first.';
  }
  return '$subjectHi सिंक नहीं हो सका — दोबारा कोशिश होगी।\n$subjectEn couldn\'t sync — will retry automatically.';
}

class _OutboxStatusTile extends StatefulWidget {
  final OutboxItem item;
  final VoidCallback? onRetake;
  const _OutboxStatusTile({required this.item, this.onRetake});

  @override
  State<_OutboxStatusTile> createState() => _OutboxStatusTileState();
}

class _OutboxStatusTileState extends State<_OutboxStatusTile> {
  bool _showTechnicalDetail = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
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
      subtitle: item.errorMessage == null
          ? null
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_friendlyErrorMessage(item), style: const TextStyle(color: Colors.red)),
                InkWell(
                  onTap: () => setState(() => _showTechnicalDetail = !_showTechnicalDetail),
                  child: Text(
                    _showTechnicalDetail ? 'Hide technical details' : 'Technical details',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12, decoration: TextDecoration.underline),
                  ),
                ),
                if (_showTechnicalDetail)
                  Text(item.errorMessage!, style: TextStyle(color: Colors.grey.shade700, fontSize: 11)),
              ],
            ),
      trailing: widget.onRetake != null
          ? TextButton(onPressed: widget.onRetake, child: const Text('Retake'))
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
