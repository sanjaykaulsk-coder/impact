import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/locale/language_toggle.dart';
import '../../core/location/get_current_position.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';
import '../execution/execution_models.dart';

class CampaignHomeScreen extends ConsumerStatefulWidget {
  const CampaignHomeScreen({super.key});

  @override
  ConsumerState<CampaignHomeScreen> createState() => _CampaignHomeScreenState();
}

class _CampaignHomeScreenState extends ConsumerState<CampaignHomeScreen> {
  Future<CampaignBrandingResponse>? _brandingFuture;
  Future<List<MyAssignment>>? _assignmentsFuture;
  Future<TodayAttendance>? _attendanceFuture;
  String? _loadedForCampaignId;
  bool _attendanceBusy = false;

  void _reloadAssignments(String campaignId) {
    setState(() {
      _assignmentsFuture = ref
          .read(executionRepositoryProvider)
          .myAssignments()
          .then((all) => all.where((a) => a.campaignId == campaignId).toList());
    });
  }

  void _reloadAttendance(String campaignId) {
    setState(() {
      _attendanceFuture = ref
          .read(executionRepositoryProvider)
          .todayAttendance(campaignId);
    });
  }

  Future<void> _markAttendance(
    String campaignId, {
    required bool isDayStart,
  }) async {
    setState(() => _attendanceBusy = true);
    try {
      // Best-effort GPS — attendance is a lightweight day marker, not a field visit, so a denied
      // permission or a location-services hiccup shouldn't block marking it.
      double? latitude;
      double? longitude;
      try {
        final position = await getCurrentPositionOrThrow();
        latitude = position.latitude;
        longitude = position.longitude;
      } catch (_) {
        // proceed without GPS
      }
      final repo = ref.read(executionRepositoryProvider);
      if (isDayStart) {
        await repo.markDayStart(
          campaignId,
          latitude: latitude,
          longitude: longitude,
        );
      } else {
        await repo.markDayEnd(
          campaignId,
          latitude: latitude,
          longitude: longitude,
        );
      }
      _reloadAttendance(campaignId);
    } catch (e) {
      if (mounted) {
        final t = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isDayStart ? t.couldNotStartDay('$e') : t.couldNotEndDay('$e'),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _attendanceBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final state = ref.watch(authControllerProvider);
    final campaignId = state.selectedCampaignId;

    if (campaignId == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/campaign-select');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_loadedForCampaignId != campaignId) {
      _loadedForCampaignId = campaignId;
      _brandingFuture = ref
          .read(authRepositoryProvider)
          .campaignBranding(campaignId);
      _assignmentsFuture = ref
          .read(executionRepositoryProvider)
          .myAssignments()
          .then((all) => all.where((a) => a.campaignId == campaignId).toList());
      _attendanceFuture = ref
          .read(executionRepositoryProvider)
          .todayAttendance(campaignId);
    }

    MyCampaignSummary? membership;
    for (final c in state.campaigns) {
      if (c.campaignId == campaignId) {
        membership = c;
        break;
      }
    }

    // Both the app-bar icon and the hardware/gesture back button need to reach the project list
    // the same explicit way (.go, not a push/pop pair — that turned out to be too fragile: whether
    // a plain route push actually stays poppable depends on router-internal bookkeeping this app
    // doesn't need to lean on). Only offered at all when there's more than one campaign to pick
    // from — for a single-campaign account there's nothing to go back to.
    final canSwitchCampaign = state.campaigns.length > 1;
    return PopScope(
      canPop: !canSwitchCampaign,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) context.go('/campaign-select');
      },
      child: Scaffold(
        appBar: AppBar(
          leading: canSwitchCampaign
              ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  tooltip: t.switchCampaign,
                  onPressed: () => context.go('/campaign-select'),
                )
              : null,
          title: Text(membership?.campaignName ?? t.defaultCampaignTitle),
          actions: [
            IconButton(
              icon: const Icon(Icons.language),
              tooltip: t.languageSettingTitle,
              onPressed: () => showLanguagePickerDialog(context),
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ],
        ),
        body: FutureBuilder<CampaignBrandingResponse>(
          future: _brandingFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                child: Text(t.couldNotLoadBranding('${snapshot.error}')),
              );
            }
            final branding = snapshot.data!;
            final primary = colorFromHex(branding.theme.primaryColor);
            final secondary = colorFromHex(branding.theme.secondaryColor);

            return SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: LinearGradient(
                        colors: [primary, secondary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          branding.campaignName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          branding.clientName,
                          style: const TextStyle(color: Colors.white70),
                        ),
                        if (branding.instructionsText != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            branding.instructionsText!,
                            style: const TextStyle(color: Colors.white),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _InfoTile(
                    label: t.signedInAs,
                    value: state.user?.fullName ?? '',
                  ),
                  _InfoTile(
                    label: t.roleLabel,
                    value: membership?.roleName ?? '',
                  ),
                  if (branding.escalationContactName != null)
                    _InfoTile(
                      label: t.escalationContact,
                      value: branding.escalationContactName!,
                    ),
                  const SizedBox(height: 16),
                  FutureBuilder<TodayAttendance>(
                    future: _attendanceFuture,
                    builder: (context, attendanceSnapshot) {
                      final today = attendanceSnapshot.data;
                      return _AttendanceCard(
                        primary: primary,
                        loading:
                            attendanceSnapshot.connectionState !=
                            ConnectionState.done,
                        busy: _attendanceBusy,
                        dayStart: today?.dayStart,
                        dayEnd: today?.dayEnd,
                        onStartDay: () =>
                            _markAttendance(campaignId, isDayStart: true),
                        onEndDay: () =>
                            _markAttendance(campaignId, isDayStart: false),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.map_outlined),
                    label: Text(t.viewRouteMap),
                    onPressed: () => context.push(
                      '/route-map',
                      extra: {
                        'campaignId': campaignId,
                        'userId': state.user!.id,
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t.todaysAssignments,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  FutureBuilder<List<MyAssignment>>(
                    future: _assignmentsFuture,
                    builder: (context, assignmentSnapshot) {
                      if (assignmentSnapshot.connectionState !=
                          ConnectionState.done) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      if (assignmentSnapshot.hasError) {
                        return _EmptyAssignmentsNotice(
                          text: t.couldNotLoadAssignments(
                            '${assignmentSnapshot.error}',
                          ),
                        );
                      }
                      final assignments = assignmentSnapshot.data ?? const [];
                      if (assignments.isEmpty) {
                        return _EmptyAssignmentsNotice(
                          text: t.noAssignmentsYet,
                        );
                      }
                      return Column(
                        children: assignments
                            .map(
                              (a) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  leading: Icon(
                                    a.status == 'IN_PROGRESS'
                                        ? Icons.pending_actions
                                        : Icons.location_on_outlined,
                                    color: primary,
                                  ),
                                  title: Text(
                                    a.pjpRow?.locationName ??
                                        t.assignmentDefaultTitle,
                                  ),
                                  subtitle: Text(
                                    a.pjpRow != null
                                        ? t.assignmentSubtitleWithLocation(
                                            a.pjpRow!.districtName,
                                            a.pjpRow!.stateName,
                                            a.status,
                                          )
                                        : a.status,
                                  ),
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () async {
                                    await context.push('/activity/${a.id}');
                                    _reloadAssignments(campaignId);
                                  },
                                ),
                              ),
                            )
                            .toList(),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _EmptyAssignmentsNotice extends StatelessWidget {
  final String text;
  const _EmptyAssignmentsNotice({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: Colors.grey),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: Colors.grey.shade600)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

String _formatTime(String isoTimestamp) {
  final t = DateTime.parse(isoTimestamp).toLocal();
  final hour = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final minute = t.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${t.hour < 12 ? 'AM' : 'PM'}';
}

// Day-start/day-end attendance (S4.3) — independent of any specific assignment, so it lives on the
// home screen rather than on an activity's detail screen.
class _AttendanceCard extends StatelessWidget {
  final Color primary;
  final bool loading;
  final bool busy;
  final AttendanceRecord? dayStart;
  final AttendanceRecord? dayEnd;
  final VoidCallback onStartDay;
  final VoidCallback onEndDay;

  const _AttendanceCard({
    required this.primary,
    required this.loading,
    required this.busy,
    required this.dayStart,
    required this.dayEnd,
    required this.onStartDay,
    required this.onEndDay,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: loading
          ? const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: CircularProgressIndicator(),
              ),
            )
          : Row(
              children: [
                Icon(Icons.access_time, color: primary),
                const SizedBox(width: 10),
                Expanded(
                  child: dayStart == null
                      ? Text(t.haventStartedDay)
                      : dayEnd == null
                      ? Text(t.dayStartedAt(_formatTime(dayStart!.checkTime)))
                      : Text(
                          t.dayStartedEnded(
                            _formatTime(dayStart!.checkTime),
                            _formatTime(dayEnd!.checkTime),
                          ),
                        ),
                ),
                if (dayStart == null)
                  ElevatedButton(
                    onPressed: busy ? null : onStartDay,
                    child: Text(busy ? t.working : t.startMyDay),
                  )
                else if (dayEnd == null)
                  ElevatedButton(
                    onPressed: busy ? null : onEndDay,
                    child: Text(busy ? t.working : t.endMyDay),
                  ),
              ],
            ),
    );
  }
}
