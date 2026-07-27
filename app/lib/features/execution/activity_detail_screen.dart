import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/location/get_current_position.dart';
import '../../core/offline/outbox_database.dart';
import '../../core/providers.dart';
import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';
import 'execution_models.dart';

// Stage 4.2 (spec §14): captures a fix on this interval while a visit is checked in, buffers a
// few before sending as one batch to POST .../gps-points — matches the backend endpoint's own
// batch shape rather than one network call per fix. Foreground-only: tracking runs while this
// screen is alive and the activity is checked in, not while the app is backgrounded — see
// docs/ASSUMPTIONS.md A-061 for why continuous background tracking is explicitly out of scope
// this session.
const _gpsCaptureInterval = Duration(seconds: 45);
const _gpsBatchSize = 3;

Map<String, String> _deviationTypeLabels(AppLocalizations t) => {
      'OUTSIDE_PERMITTED_RADIUS': t.deviationOutsideRadius,
      'UNPLANNED_LOCATION': t.deviationUnplanned,
      'SKIPPED_LOCATION': t.deviationSkipped,
      'WRONG_SEQUENCE': t.deviationWrongSequence,
      'LATE_ARRIVAL': t.deviationLateArrival,
      'EARLY_DEPARTURE': t.deviationEarlyDeparture,
      'UNPLANNED_STOPPAGE': t.deviationUnplannedStoppage,
      'GPS_DISABLED': t.deviationGpsDisabled,
      'ABNORMAL_SPEED': t.deviationAbnormalSpeed,
      'SUSPECTED_LOCATION_MANIPULATION': t.deviationSuspectedManipulation,
    };

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

  Timer? _gpsTimer;
  final List<Map<String, dynamic>> _gpsBuffer = [];
  GpsPointResult? _flaggedPoint;
  String? _gpsCaptureError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _gpsTimer?.cancel();
    super.dispose();
  }

  String get _campaignId => ref.read(authControllerProvider).selectedCampaignId!;

  void _startGpsTrackingIfNeeded(bool hasCheckIn, bool hasCheckOut) {
    if (_gpsTimer != null || !hasCheckIn || hasCheckOut) return;
    _gpsTimer = Timer.periodic(_gpsCaptureInterval, (_) => _captureGpsTick());
  }

  void _stopGpsTracking() {
    _gpsTimer?.cancel();
    _gpsTimer = null;
    _gpsBuffer.clear();
  }

  Future<void> _captureGpsTick() async {
    if (_bundle == null) return;
    try {
      final position = await getCurrentPositionOrThrow();
      _gpsBuffer.add({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracyMeters': position.accuracy,
        'speedKmh': position.speed * 3.6,
        'recordedAt': DateTime.now().toIso8601String(),
      });
      if (mounted && _gpsCaptureError != null) setState(() => _gpsCaptureError = null);
    } catch (e) {
      // Silent — a missed background fix shouldn't interrupt whatever the field worker is
      // actually doing (filling a form, taking a photo). Surfaced subtly in the UI, not a SnackBar.
      if (mounted) setState(() => _gpsCaptureError = e.toString());
      return;
    }
    if (_gpsBuffer.length >= _gpsBatchSize) await _flushGpsBuffer();
  }

  Future<void> _flushGpsBuffer() async {
    if (_bundle == null || _gpsBuffer.isEmpty) return;
    final batch = List<Map<String, dynamic>>.from(_gpsBuffer);
    _gpsBuffer.clear();
    try {
      final result = await ref.read(executionRepositoryProvider).ingestGpsPoints(_campaignId, _bundle!.activity.id, batch);
      final flagged = result.points.where((p) => p.isFlagged).toList();
      if (flagged.isNotEmpty && mounted) setState(() => _flaggedPoint = flagged.last);
    } catch (_) {
      // Best-effort background enhancement (see class-level comment) — a failed batch (e.g. no
      // connectivity) is simply not retried; the next capture tick tries again on its own.
    }
  }

  void _openDeviationDialog({String? prefilledType, double? distanceMeters}) {
    if (_bundle == null) return;
    final t = AppLocalizations.of(context)!;
    showDialog<void>(
      context: context,
      builder: (_) => _DeviationDialog(
        initialType: prefilledType,
        distanceMeters: distanceMeters,
        onSubmit: (type, reason, remarks) async {
          await ref.read(executionRepositoryProvider).submitDeviationRequest(
                _campaignId,
                _bundle!.activity.id,
                deviationType: type,
                reason: reason,
                remarks: remarks,
                distanceMeters: distanceMeters,
              );
          if (mounted) {
            setState(() => _flaggedPoint = null);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(t.sentToSupervisor)),
            );
          }
        },
      ),
    );
  }

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
      _startGpsTrackingIfNeeded(bundle.hasCheckIn, bundle.hasCheckOut);
      if (bundle.hasCheckOut) _stopGpsTracking();
    } catch (e) {
      if (!mounted) return;
      if (isInitialLoad) {
        setState(() => _error = e is ApiException ? e.message : e.toString());
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.couldNotRefresh)),
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
      _startGpsTrackingIfNeeded(true, false);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.checkInFailed('$e'))));
      }
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
      _stopGpsTracking();
      await _syncNow();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.checkOutFailed('$e'))));
      }
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  /// Marks one pre-activity SOP checklist item (spec §12). Direct online call, same reasoning as
  /// resubmit() — this is a lightweight admin-configured checklist, not field-captured evidence.
  Future<void> _markSopItem(String itemId, String status) async {
    setState(() => _actionInProgress = true);
    try {
      await ref.read(executionRepositoryProvider).markSopChecklistItem(
            _campaignId,
            _bundle!.activity.id,
            itemId,
            status: status,
          );
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.couldNotUpdateChecklist('$e'))),
        );
      }
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context)!.couldNotResubmit('$e'))));
      }
    } finally {
      if (mounted) setState(() => _actionInProgress = false);
    }
  }

  String? _flaggedTypeFor(GpsPointResult point) {
    if (!point.withinTolerance) return 'OUTSIDE_PERMITTED_RADIUS';
    if (point.suspectedManipulation) return 'SUSPECTED_LOCATION_MANIPULATION';
    if (point.abnormalSpeed) return 'ABNORMAL_SPEED';
    return null;
  }

  String _flaggedPointMessage(AppLocalizations t, GpsPointResult point) {
    if (!point.withinTolerance) {
      final d = point.distanceFromPlannedMeters;
      return d != null ? t.distanceFromPlanned('${d.round()}') : t.awayFromPlanned;
    }
    if (point.suspectedManipulation) return t.unusualLocationJump;
    if (point.abnormalSpeed) return t.unusualSpeed;
    return t.somethingUnusual;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(AppLocalizations.of(context)!.activityTitle)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
              : _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    final t = AppLocalizations.of(context)!;
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
              Text(milestone?.name ?? t.fieldActivityDefault, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(t.statusLabel(bundle.activity.status), style: TextStyle(color: Colors.grey.shade600)),
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
                            Text(t.sentBackBySupervisor, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade900)),
                            const SizedBox(height: 4),
                            Text(bundle.approval?.remarks ?? t.noReasonGiven, style: TextStyle(color: Colors.red.shade900)),
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
                  child: Text(t.waitingForReview, style: TextStyle(color: Colors.amber.shade900)),
                ),
              if (isApproved)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade200)),
                  child: Text(t.approvedBySupervisor, style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold)),
                ),

              // Spec §14: "detected -> user warned -> user selects reason + remarks -> submits
              // deviation request" — the activity is never blocked by this, only flagged.
              if (hasCheckIn && !hasCheckOut && _flaggedPoint != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.amber.shade300)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.amber.shade900),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_flaggedPointMessage(t, _flaggedPoint!), style: TextStyle(color: Colors.amber.shade900)),
                            const SizedBox(height: 8),
                            OutlinedButton(
                              onPressed: () => _openDeviationDialog(
                                prefilledType: _flaggedTypeFor(_flaggedPoint!),
                                distanceMeters: _flaggedPoint!.distanceFromPlannedMeters,
                              ),
                              child: Text(t.explain),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              if (bundle.sopItems.isNotEmpty && !hasCheckIn) ...[
                Text(t.preActivityChecklist, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                ...bundle.sopItems.map((item) => _SopChecklistTile(
                      item: item,
                      enabled: !_actionInProgress,
                      onMark: (status) => _markSopItem(item.id, status),
                    )),
                const SizedBox(height: 12),
              ],

              _RequirementTile(
                icon: Icons.my_location,
                label: t.gpsCheckIn,
                done: hasCheckIn,
                subtitle: needsGps ? t.required : t.notRequiredForMilestone,
              ),
              _RequirementTile(
                icon: Icons.camera_alt,
                label: t.photos,
                done: photoCount >= requiredPhotos,
                subtitle: t.photosCountCaptured('$photoCount', '$requiredPhotos'),
              ),
              if (needsForm)
                _RequirementTile(icon: Icons.assignment, label: t.outletVisitForm, done: hasFormResponse, subtitle: hasFormResponse ? t.submitted : t.notSubmittedYet),

              const SizedBox(height: 20),

              if (!hasCheckIn)
                ElevatedButton.icon(
                  onPressed: _actionInProgress ? null : _checkIn,
                  icon: const Icon(Icons.my_location),
                  label: Text(t.checkIn),
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
                    label: Text(isRejected ? t.retakeOpeningPhoto : t.takeOpeningPhoto),
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
                    label: Text(isRejected ? t.editOutletForm : t.fillOutletForm),
                  ),
                ),
              if (canCheckOut)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress ? null : _checkOut,
                    icon: const Icon(Icons.check_circle),
                    label: Text(t.checkOutComplete),
                  ),
                ),
              if (isRejected)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ElevatedButton.icon(
                    onPressed: _actionInProgress ? null : _resubmit,
                    icon: const Icon(Icons.send),
                    label: Text(t.resubmitForReview),
                  ),
                ),
              if (hasCheckOut && !isRejected && !isPendingReview && !isApproved)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(t.activityCompleted, style: const TextStyle(fontWeight: FontWeight.bold)),
                ),

              if (hasCheckIn && !hasCheckOut) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(Icons.location_on, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(
                      _gpsCaptureError == null ? t.locationTrackingOn : t.locationTrackingPaused,
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _openDeviationDialog(),
                  icon: const Icon(Icons.report_problem_outlined),
                  label: Text(t.reportDeviationFromPlan),
                ),
              ],

              if (outbox.isNotEmpty) ...[
                const SizedBox(height: 24),
                Text(t.syncStatus, style: Theme.of(context).textTheme.titleMedium),
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
                  label: Text(t.syncNow),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _SopChecklistTile extends StatelessWidget {
  final SopChecklistItemStatus item;
  final bool enabled;
  final ValueChanged<String> onMark;
  const _SopChecklistTile({required this.item, required this.enabled, required this.onMark});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final done = item.status == 'COMPLETED' || item.status == 'NOT_APPLICABLE';
    return ListTile(
      dense: true,
      leading: Icon(
        done ? Icons.check_circle : Icons.radio_button_unchecked,
        color: done ? Colors.green : (item.isMandatory ? Colors.orange : Colors.grey),
      ),
      title: Text(item.label),
      subtitle: Text(item.isMandatory ? t.mandatory : t.optional),
      trailing: done
          ? Text(item.status == 'COMPLETED' ? t.done : t.notApplicableShort, style: const TextStyle(color: Colors.green))
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton(
                  onPressed: enabled ? () => onMark('NOT_APPLICABLE') : null,
                  child: Text(t.notApplicableShort),
                ),
                TextButton(
                  onPressed: enabled ? () => onMark('COMPLETED') : null,
                  child: Text(t.done),
                ),
              ],
            ),
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
    final t = AppLocalizations.of(context)!;
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
      title: Text(_labelFor(t, item.type)),
      subtitle: item.errorMessage == null
          ? null
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_friendlyErrorMessage(item), style: const TextStyle(color: Colors.red)),
                InkWell(
                  onTap: () => setState(() => _showTechnicalDetail = !_showTechnicalDetail),
                  child: Text(
                    _showTechnicalDetail ? t.hideTechnicalDetails : t.technicalDetails,
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12, decoration: TextDecoration.underline),
                  ),
                ),
                if (_showTechnicalDetail)
                  Text(item.errorMessage!, style: TextStyle(color: Colors.grey.shade700, fontSize: 11)),
              ],
            ),
      trailing: widget.onRetake != null
          ? TextButton(onPressed: widget.onRetake, child: Text(t.retake))
          : Text(item.status),
    );
  }

  String _labelFor(AppLocalizations t, String type) => switch (type) {
        'checkIn' => t.outboxTypeCheckIn,
        'checkOut' => t.outboxTypeCheckOut,
        'media' => t.outboxTypePhoto,
        'milestoneResponse' => t.outboxTypeFormSubmission,
        _ => type,
      };
}

/// Spec §14's deviation-request form — a reason is always required (matching the backend's own
/// validation), remarks optional. `onSubmit` throwing propagates back into this dialog's own error
/// display rather than being swallowed, since a field worker submitting an explanation is a
/// deliberate action, not a background enhancement.
class _DeviationDialog extends StatefulWidget {
  final String? initialType;
  final double? distanceMeters;
  final Future<void> Function(String type, String reason, String? remarks) onSubmit;

  const _DeviationDialog({this.initialType, this.distanceMeters, required this.onSubmit});

  @override
  State<_DeviationDialog> createState() => _DeviationDialogState();
}

class _DeviationDialogState extends State<_DeviationDialog> {
  late String _type;
  final _reasonController = TextEditingController();
  final _remarksController = TextEditingController();
  bool _submitting = false;
  String? _error;

  static const _deviationTypeKeys = [
    'OUTSIDE_PERMITTED_RADIUS',
    'UNPLANNED_LOCATION',
    'SKIPPED_LOCATION',
    'WRONG_SEQUENCE',
    'LATE_ARRIVAL',
    'EARLY_DEPARTURE',
    'UNPLANNED_STOPPAGE',
    'GPS_DISABLED',
    'ABNORMAL_SPEED',
    'SUSPECTED_LOCATION_MANIPULATION',
  ];

  @override
  void initState() {
    super.initState();
    _type = widget.initialType ?? _deviationTypeKeys.first;
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reasonController.text.trim().isEmpty) {
      setState(() => _error = AppLocalizations.of(context)!.pleaseExplainWhatHappened);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.onSubmit(_type, _reasonController.text.trim(), _remarksController.text.trim().isEmpty ? null : _remarksController.text.trim());
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiException ? e.message : e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final deviationTypeLabels = _deviationTypeLabels(t);
    return AlertDialog(
      title: Text(t.reportADeviation),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.deviationExplainerText),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: InputDecoration(labelText: t.whatHappened),
              items: _deviationTypeKeys
                  .map((key) => DropdownMenuItem(value: key, child: Text(deviationTypeLabels[key]!)))
                  .toList(),
              onChanged: _submitting ? null : (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              enabled: !_submitting,
              decoration: InputDecoration(labelText: t.reasonLabel),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _remarksController,
              enabled: !_submitting,
              decoration: InputDecoration(labelText: t.remarksOptionalLabel),
              maxLines: 2,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _submitting ? null : () => Navigator.of(context).pop(), child: Text(t.cancel)),
        ElevatedButton(onPressed: _submitting ? null : _submit, child: Text(_submitting ? t.sending : t.submit)),
      ],
    );
  }
}
