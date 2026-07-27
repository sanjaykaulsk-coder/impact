import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';

class CampaignSelectScreen extends ConsumerWidget {
  const CampaignSelectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        title: Text(t.selectCampaignTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t.helloUser(state.user?.fullName ?? ''),
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 4),
              Text(
                t.accessToCampaigns(state.campaigns.length),
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: state.campaigns.isEmpty
                    ? Center(child: Text(t.noActiveCampaignRole))
                    : ListView.separated(
                        itemCount: state.campaigns.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final c = state.campaigns[index];
                          return Card(
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(color: Colors.grey.shade300),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(14),
                              title: Text(
                                c.campaignName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: Text(
                                t.clientRoleLine(c.clientName, c.roleName),
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                ref
                                    .read(authControllerProvider.notifier)
                                    .selectCampaign(c.campaignId);
                                context.go('/home');
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
