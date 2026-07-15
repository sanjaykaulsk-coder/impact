import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
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
  String? _loadedForCampaignId;

  void _reloadAssignments(String campaignId) {
    setState(() {
      _assignmentsFuture = ref.read(executionRepositoryProvider).myAssignments().then(
            (all) => all.where((a) => a.campaignId == campaignId).toList(),
          );
    });
  }

  @override
  Widget build(BuildContext context) {
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
      _brandingFuture = ref.read(authRepositoryProvider).campaignBranding(campaignId);
      _assignmentsFuture = ref.read(executionRepositoryProvider).myAssignments().then(
            (all) => all.where((a) => a.campaignId == campaignId).toList(),
          );
    }

    MyCampaignSummary? membership;
    for (final c in state.campaigns) {
      if (c.campaignId == campaignId) {
        membership = c;
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(membership?.campaignName ?? 'Campaign'),
        actions: [
          if (state.campaigns.length > 1)
            IconButton(
              icon: const Icon(Icons.swap_horiz),
              tooltip: 'Switch campaign',
              onPressed: () => context.go('/campaign-select'),
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
            return Center(child: Text('Could not load campaign branding: ${snapshot.error}'));
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
                    gradient: LinearGradient(colors: [primary, secondary], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        branding.campaignName,
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(branding.clientName, style: const TextStyle(color: Colors.white70)),
                      if (branding.instructionsText != null) ...[
                        const SizedBox(height: 12),
                        Text(branding.instructionsText!, style: const TextStyle(color: Colors.white)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _InfoTile(label: 'Signed in as', value: state.user?.fullName ?? ''),
                _InfoTile(label: 'Role', value: membership?.roleName ?? ''),
                if (branding.escalationContactName != null)
                  _InfoTile(label: 'Escalation contact', value: branding.escalationContactName!),
                const SizedBox(height: 16),
                Text('Today\'s assignments', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                FutureBuilder<List<MyAssignment>>(
                  future: _assignmentsFuture,
                  builder: (context, assignmentSnapshot) {
                    if (assignmentSnapshot.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (assignmentSnapshot.hasError) {
                      return _EmptyAssignmentsNotice(text: 'Could not load assignments: ${assignmentSnapshot.error}');
                    }
                    final assignments = assignmentSnapshot.data ?? const [];
                    if (assignments.isEmpty) {
                      return const _EmptyAssignmentsNotice(text: 'No assignments for this campaign yet.');
                    }
                    return Column(
                      children: assignments
                          .map(
                            (a) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: Icon(
                                  a.status == 'IN_PROGRESS' ? Icons.pending_actions : Icons.location_on_outlined,
                                  color: primary,
                                ),
                                title: Text(a.pjpRow?.locationName ?? 'Assignment'),
                                subtitle: Text(
                                  a.pjpRow != null
                                      ? '${a.pjpRow!.districtName}, ${a.pjpRow!.stateName} — ${a.status}'
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
